import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InvoiceRepository } from '../../shared/repositories/invoice.repository';
import { CreditNoteRepository } from '../../shared/repositories/creditNote.repository';
import { Invoice } from '../../shared/entities/invoice.entity';
import { InvoiceDetaill } from '../../shared/entities/invoiceDetaill.entity';
import { CreditNote } from '../../shared/entities/creditNote.entity';
import { StateType } from '../../shared/entities/stateType.entity';
import { Product } from '../../shared/entities/product.entity';
import { FactusClient } from '../factus.client';
import { FactusApiError } from '../errors/factus-api.error';
import { FactusInvoiceService } from './factus-invoice.service';
import { RecipeService } from '../../recipes/services/recipe.service';
import { MailsService } from '../../shared/services/mails.service';
import { MailAttachment } from '../../shared/interfaces/mail.interface';
import {
  CreateCreditNoteOptions,
  FactusCreditNoteResult,
} from '../interfaces/credit-note.interfaces';
import * as QRCode from 'qrcode';
import { createHash } from 'crypto';

// Factus payment_form/method por PayType.code (mismo mapa que factus-invoice).
const PAYMENT_METHOD_MAP: Record<string, { form: string; method: string }> = {
  EFE: { form: '1', method: '10' },
  TRAS: { form: '1', method: '42' },
  CRE: { form: '2', method: '1' },
  EFECT: { form: '1', method: '10' },
  NA: { form: '1', method: '42' },
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Productos de receta (RES): al venderlos consumen ingredientes, NO el stock
// propio, así que tampoco se les devuelve stock al hacer la nota crédito.
const RECIPE_CATEGORY_CODES = ['RES'];

// Ventana para considerar dos solicitudes de nota crédito como la MISMA (doble
// click / reintento por respuesta perdida). Dentro de ella, una solicitud con
// idéntico contenido devuelve la NC ya emitida en vez de crear una segunda.
const DEDUP_WINDOW_MS = 2 * 60 * 1000;

@Injectable()
export class FactusCreditNoteService {
  private readonly logger = new Logger(FactusCreditNoteService.name);

  // Serializa la emisión de notas crédito por factura dentro de la instancia.
  // Evita la condición de carrera del doble-submit (dos solicitudes en paralelo
  // pasando ambas la validación de "restante" antes de que cualquiera persista).
  // OJO: es en memoria → válido para una sola instancia (igual que el token
  // Factus). Si se escala horizontalmente, mover a un lock distribuido (Redis).
  private readonly invoiceLocks = new Map<number, Promise<void>>();

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly creditNoteRepository: CreditNoteRepository,
    private readonly factusClient: FactusClient,
    private readonly invoiceService: FactusInvoiceService,
    private readonly recipeService: RecipeService,
    private readonly mailsService: MailsService,
  ) {}

  /** Notas crédito ya emitidas de una factura (más recientes primero). */
  async listForInvoice(invoiceId: number): Promise<CreditNote[]> {
    return this.creditNoteRepository.find({
      where: { invoiceId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Ejecuta `fn` en exclusión mutua por factura: las solicitudes para la misma
   * factura se encolan y corren de a una. Es la pieza que cierra la doble
   * emisión por solicitudes concurrentes (el dedupe por contenido cubre el
   * reintento secuencial; este cubre el simultáneo).
   */
  private async withInvoiceLock<T>(
    invoiceId: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = this.invoiceLocks.get(invoiceId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));
    const tail = previous.then(() => current);
    this.invoiceLocks.set(invoiceId, tail);

    await previous.catch(() => undefined); // espera al anterior (sin propagar su error)
    try {
      return await fn();
    } finally {
      release();
      // Si nadie se encadenó después, limpia la entrada para no acumular memoria.
      if (this.invoiceLocks.get(invoiceId) === tail) {
        this.invoiceLocks.delete(invoiceId);
      }
    }
  }

  /**
   * Hash determinista del contenido de una nota crédito (total/parcial, concepto
   * y selección normalizada). Dos solicitudes con el mismo contenido producen el
   * mismo hash → base del dedupe idempotente.
   */
  private computeRequestHash(
    isTotal: boolean,
    concept: string,
    selection: { invoiceDetailId: number; quantity: number }[],
  ): string {
    const norm = [...selection]
      .map((s) => ({ id: Number(s.invoiceDetailId), q: Number(s.quantity) }))
      .sort((a, b) => a.id - b.id)
      .map((s) => `${s.id}:${s.q}`)
      .join(',');
    return createHash('sha1')
      .update(`${isTotal ? 'T' : 'P'}|${concept}|${norm}`)
      .digest('hex');
  }

  /** Hash de una nota crédito ya persistida (a partir de su snapshot). */
  private noteHash(note: CreditNote): string {
    const sel = Array.isArray(note.itemsSnapshot)
      ? (note.itemsSnapshot as { invoiceDetailId: number; quantity: number }[])
      : [];
    return this.computeRequestHash(
      note.isTotal,
      note.correctionConceptCode,
      sel,
    );
  }

  /** Reconstruye el resultado normalizado a partir de una NC ya guardada. */
  private resultFromNote(note: CreditNote): FactusCreditNoteResult {
    return {
      number: note.factusNumber ?? null,
      referenceCode: note.referenceCode,
      isValidated: true,
      cude: note.factusCude ?? null,
      qrCode: note.factusQrCode ?? null,
      publicUrl: note.factusPublicUrl ?? null,
      total: note.total,
      createdAt:
        note.createdAt instanceof Date
          ? note.createdAt.toISOString()
          : new Date(note.createdAt ?? Date.now()).toISOString(),
    };
  }

  /**
   * Cantidad ya acreditada por `invoiceDetailId` en notas crédito previas de la
   * factura (suma de los snapshots de selección). Base del cálculo del restante.
   */
  private getCreditedQuantities(notes: CreditNote[]): Map<number, number> {
    const map = new Map<number, number>();
    for (const note of notes) {
      const sel = note.itemsSnapshot as
        | { invoiceDetailId: number; quantity: number }[]
        | null;
      if (!Array.isArray(sel)) continue;
      for (const it of sel) {
        if (it && typeof it.invoiceDetailId === 'number') {
          map.set(
            it.invoiceDetailId,
            (map.get(it.invoiceDetailId) ?? 0) + Number(it.quantity ?? 0),
          );
        }
      }
    }
    return map;
  }

  /**
   * Genera y valida una nota crédito sobre una factura electrónica ya emitida.
   * - Total (isTotal): anula la factura completa (concepto '2'), todos los ítems.
   * - Parcial: solo los ítems/cantidades seleccionados (concepto '1').
   * Se omite `customer` (Factus toma el del bill referenciado) y
   * `numbering_range_id` (Factus usa el rango NC por defecto de la cuenta).
   */
  async createForInvoice(
    invoiceId: number,
    options: CreateCreditNoteOptions,
  ): Promise<FactusCreditNoteResult> {
    // Toda la operación (validar restante → emitir en Factus → persistir →
    // revertir inventario) corre bajo lock por factura para que dos solicitudes
    // simultáneas no emitan dos notas crédito ni reviertan el stock dos veces.
    return this.withInvoiceLock(invoiceId, () =>
      this.doCreateForInvoice(invoiceId, options),
    );
  }

  private async doCreateForInvoice(
    invoiceId: number,
    options: CreateCreditNoteOptions,
  ): Promise<FactusCreditNoteResult> {
    const invoice = await this.loadInvoice(invoiceId);

    if (!invoice.factusNumber) {
      throw new BadRequestException(
        'Solo se puede generar una nota crédito sobre una factura electrónica ya emitida a la DIAN.',
      );
    }

    const isTotal = !!options.isTotal;
    const correctionConceptCode =
      options.correctionConceptCode ?? (isTotal ? '2' : '1');

    const activeDetails = (invoice.invoiceDetails ?? []).filter(
      (d) => !d.deletedAt,
    );
    if (activeDetails.length === 0) {
      throw new BadRequestException('La factura no tiene ítems.');
    }

    // Notas crédito ya emitidas (una sola lectura): sirven tanto para el cálculo
    // del restante (no sobre-acreditar) como para el dedupe idempotente.
    const existingNotes = await this.creditNoteRepository.find({
      where: { invoiceId },
    });

    // Lo ya acreditado por ítem en notas crédito previas, para que la suma de
    // todas las NC nunca exceda lo realmente vendido (evita sobre-acreditar).
    const alreadyCredited = this.getCreditedQuantities(existingNotes);
    const remainingOf = (d: InvoiceDetaill): number =>
      Number(d.amount ?? 1) - (alreadyCredited.get(d.invoiceDetailId) ?? 0);

    // Selección de ítems: total → el RESTANTE de todos; parcial → los indicados.
    let selected: { detail: InvoiceDetaill; quantity: number }[];
    if (isTotal) {
      selected = activeDetails
        .map((detail) => ({ detail, quantity: remainingOf(detail) }))
        .filter((s) => s.quantity > 0);
      if (selected.length === 0) {
        throw new BadRequestException(
          'La factura ya fue acreditada en su totalidad.',
        );
      }
    } else {
      const selections = options.items ?? [];
      if (selections.length === 0) {
        throw new BadRequestException(
          'Una nota crédito parcial requiere al menos un ítem.',
        );
      }
      selected = selections.map((sel) => {
        const detail = activeDetails.find(
          (d) => d.invoiceDetailId === sel.invoiceDetailId,
        );
        if (!detail) {
          throw new BadRequestException(
            `El ítem ${sel.invoiceDetailId} no pertenece a la factura.`,
          );
        }
        const remaining = remainingOf(detail);
        const quantity = sel.quantity != null ? Number(sel.quantity) : remaining;
        if (!(quantity > 0) || quantity > remaining) {
          throw new BadRequestException(
            `Cantidad inválida para el ítem ${sel.invoiceDetailId} ` +
              `(disponible para acreditar: ${remaining}).`,
          );
        }
        return { detail, quantity };
      });
    }

    // Selección normalizada (lo que se persiste como snapshot) y su hash.
    const selection = selected.map((s) => ({
      invoiceDetailId: s.detail.invoiceDetailId,
      quantity: s.quantity,
    }));
    const requestHash = this.computeRequestHash(
      isTotal,
      correctionConceptCode,
      selection,
    );

    // Dedupe idempotente: si ya existe una NC con contenido idéntico emitida
    // hace muy poco (doble-click / reintento por respuesta perdida), se devuelve
    // esa misma en vez de crear una segunda → no hay doble emisión en la DIAN ni
    // doble reversión de inventario.
    const duplicate = existingNotes.find(
      (n) =>
        Date.now() - new Date(n.createdAt).getTime() < DEDUP_WINDOW_MS &&
        this.noteHash(n) === requestHash,
    );
    if (duplicate) {
      this.logger.warn(
        `Nota crédito duplicada en la factura ${invoiceId} ` +
          `(reintento dentro de ${DEDUP_WINDOW_MS / 1000}s): se devuelve la ` +
          `existente ${duplicate.factusNumber ?? duplicate.referenceCode} sin reemitir.`,
      );
      return this.resultFromNote(duplicate);
    }

    // Reutiliza el mapeo de ítems/impuestos y del cliente del servicio de
    // facturas (misma lógica, una sola fuente de verdad).
    const items = selected.map(({ detail, quantity }) =>
      this.invoiceService.mapDetail(detail, quantity),
    );
    const customer = this.invoiceService.buildCustomer(invoice);

    // Total exacto (neto + IVA por línea, redondeado a 2 decimales como Factus).
    const total = items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity as string);
      const price = parseFloat(item.price as string);
      const discount = parseFloat(item.discount_rate as string);
      const taxRate = parseFloat((item.taxes as any[])[0].rate as string);
      const net = round2(qty * price * (1 - discount / 100));
      const tax = round2((net * taxRate) / 100);
      return sum + net + tax;
    }, 0);

    const payTypeCode = invoice.payType?.code ?? 'TRAS';
    const payment = PAYMENT_METHOD_MAP[payTypeCode] ?? PAYMENT_METHOD_MAP.TRAS;

    const referenceCode = `NC-${invoice.code}-${Date.now()}`;
    const observation = (options.observation ?? '').slice(0, 250);

    const payload: Record<string, unknown> = {
      reference_code: referenceCode,
      correction_concept_code: correctionConceptCode,
      // customization_id por defecto 20 (con referencia a factura) → se omite.
      bill_number: invoice.factusNumber,
      observation,
      payment_details: [
        {
          payment_form: payment.form,
          payment_method_code: payment.method,
          amount: total.toFixed(2),
        },
      ],
      // Factus EXIGE customer aunque se referencie la factura por bill_number
      // (la omisión solo aplica con bill_id entero). Se reusa el del cliente.
      customer,
      // numbering_range_id omitido → Factus usa el rango NC por defecto.
      items,
    };

    const raw = await this.createAndValidate(payload);
    const result = this.extractResult(raw, referenceCode, total);

    await this.persist(invoice, {
      referenceCode,
      correctionConceptCode,
      isTotal,
      observation,
      result,
      selection,
    });

    // Devolución de inventario por lo acreditado (igual que al eliminar una
    // factura): productos → stock; accommodations → estado Disponible.
    await this.reverseInventory(selected);

    // Correo + PDF oficial en segundo plano (best-effort; no afecta la validez
    // fiscal ni bloquea la respuesta), igual que la emisión de facturas.
    this.dispatchNotifications(invoice, result);

    return result;
  }

  /**
   * Notificaciones posteriores a la emisión (segundo plano): arma el QR inline y
   * el PDF oficial de Factus una sola vez y envía las copias al cliente y al
   * negocio en paralelo. Best-effort: cualquier fallo solo queda en logs.
   */
  private dispatchNotifications(
    invoice: Invoice,
    result: FactusCreditNoteResult,
  ): void {
    void (async () => {
      try {
        const attachments = await this.buildAttachments(result);
        await Promise.allSettled([
          this.notifyCustomer(invoice, result, attachments),
          this.notifyBusiness(invoice, result, attachments),
        ]);
      } catch (error) {
        this.logger.error(
          `Fallo en notificaciones de la nota crédito ${result.number ?? result.referenceCode}: ${
            (error as Error).message
          }`,
        );
      }
    })();
  }

  /** QR DIAN inline (cid:qr-nc) + PDF oficial de la nota crédito (base64). */
  private async buildAttachments(
    result: FactusCreditNoteResult,
  ): Promise<MailAttachment[]> {
    const attachments: MailAttachment[] = [];

    if (result.qrCode) {
      try {
        const png = await QRCode.toBuffer(result.qrCode, {
          width: 240,
          margin: 1,
        });
        attachments.push({
          filename: 'qr-dian.png',
          content: png,
          contentType: 'image/png',
          cid: 'qr-nc',
        });
      } catch (error) {
        this.logger.warn(
          `No se pudo generar el QR de la nota crédito ${result.number}: ${
            (error as Error).message
          }`,
        );
      }
    }

    // PDF OFICIAL de Factus (a diferencia de las facturas, las notas crédito sí
    // exponen el PDF en base64).
    if (result.number) {
      const pdf = await this.downloadOfficialPdf(result.number);
      if (pdf) {
        attachments.push({
          filename: `nota-credito-${result.number}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        });
      }
    }

    return attachments;
  }

  private async downloadOfficialPdf(number: string): Promise<Buffer | null> {
    try {
      const res = await this.factusClient.get<any>(
        `/v2/credit-notes/${encodeURIComponent(number)}/download-pdf`,
      );
      const base64 =
        res?.data?.pdf_base_64_encoded ?? res?.pdf_base_64_encoded ?? null;
      return base64 ? Buffer.from(base64, 'base64') : null;
    } catch (error) {
      this.logger.warn(
        `No se pudo descargar el PDF oficial de la nota crédito ${number}: ${
          (error as Error).message
        }`,
      );
      return null;
    }
  }

  private async notifyCustomer(
    invoice: Invoice,
    result: FactusCreditNoteResult,
    attachments: MailAttachment[],
  ): Promise<void> {
    const to = invoice.user?.email?.trim();
    const isValidEmail = !!to && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to);
    if (!isValidEmail) {
      this.logger.warn(
        `Nota crédito ${result.number}: el cliente no tiene email válido; no se envió copia.`,
      );
      return;
    }
    const orgName =
      invoice.organizational?.legalName ?? invoice.organizational?.name ?? '';
    try {
      await this.mailsService.sendEmail({
        to: to!,
        subject: `Nota crédito ${result.number ?? result.referenceCode} — ${orgName}`,
        body: this.buildEmailHtml(invoice, result, orgName, 'customer'),
        attachments,
      });
      this.logger.log(`Copia de la nota crédito ${result.number} enviada al cliente (${to}).`);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar la nota crédito ${result.number} al cliente: ${
          (error as Error).message
        }`,
      );
    }
  }

  private async notifyBusiness(
    invoice: Invoice,
    result: FactusCreditNoteResult,
    attachments: MailAttachment[],
  ): Promise<void> {
    // Igual que las facturas: la copia al negocio solo se envía en producción.
    if (process.env.APP_ENV !== 'production') return;
    const to = invoice.organizational?.email?.trim();
    if (!to) return;
    const orgName =
      invoice.organizational?.legalName ?? invoice.organizational?.name ?? '';
    try {
      await this.mailsService.sendEmail({
        to,
        subject: `Nota crédito ${result.number ?? result.referenceCode} — ${orgName}`,
        body: this.buildEmailHtml(invoice, result, orgName, 'business'),
        attachments,
      });
      this.logger.log(`Copia de la nota crédito ${result.number} enviada al negocio (${to}).`);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar la nota crédito ${result.number} al negocio: ${
          (error as Error).message
        }`,
      );
    }
  }

  private buildEmailHtml(
    invoice: Invoice,
    result: FactusCreditNoteResult,
    orgName: string,
    audience: 'customer' | 'business',
  ): string {
    const clientName =
      `${invoice.user?.firstName ?? ''} ${invoice.user?.lastName ?? ''}`.trim();
    const isCustomer = audience === 'customer';
    const intro = isCustomer
      ? `Hola ${clientName || ''}, te compartimos la nota crédito asociada a tu factura <strong>${invoice.factusNumber ?? invoice.code}</strong> de <strong>${orgName}</strong>.`
      : `<strong>${orgName}</strong> — copia de la nota crédito emitida${clientName ? ` a ${clientName}` : ''}.`;
    const url = result.publicUrl ?? '';
    const row = (label: string, value: string) => `
            <tr>
              <td style="padding:6px 10px; color:#6b7280; font-size:13px; white-space:nowrap;">${label}</td>
              <td style="padding:6px 10px; color:#111827; font-size:14px; font-weight:600; word-break:break-all;">${value}</td>
            </tr>`;
    return `
      <div style="margin:0; padding:24px; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
          <div style="background:#486e2b; padding:20px 24px;">
            <h1 style="margin:0; color:#ffffff; font-size:20px;">Nota crédito</h1>
            <p style="margin:4px 0 0; color:#dbe7cf; font-size:13px;">${orgName}</p>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 16px; color:#374151; font-size:14px; line-height:1.5;">${intro}</p>
            <table style="border-collapse:collapse; width:100%; background:#f9fafb; border:1px solid #eef0f2; border-radius:8px;">
              ${row('Nota crédito', result.number ?? '—')}
              ${row('Factura', invoice.factusNumber ?? invoice.code)}
              ${row('CUDE', result.cude ?? '—')}
              ${row('Total', result.total)}
            </table>
            ${
              url
                ? `<div style="margin:20px 0;"><a href="${url}" style="display:inline-block; background:#486e2b; color:#ffffff; text-decoration:none; padding:10px 18px; border-radius:8px; font-size:14px; font-weight:600;">Ver la nota crédito oficial</a></div>`
                : ''
            }
            ${
              result.qrCode
                ? `<div style="margin-top:16px; text-align:center;"><img src="cid:qr-nc" alt="QR DIAN" width="150" height="150" style="border:1px solid #e5e7eb; border-radius:8px; padding:6px; background:#fff;" /><p style="margin:6px 0 0; color:#9ca3af; font-size:12px;">Escanea para validar en la DIAN</p></div>`
                : ''
            }
          </div>
          <div style="padding:14px 24px; background:#f9fafb; border-top:1px solid #eef0f2;">
            <p style="margin:0; color:#9ca3af; font-size:12px;">Este es un mensaje automático, si tiene una duda por favor responda a él.</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Revierte el inventario por los ítems acreditados, espejando el "deshacer"
   * de eliminar una factura (invoice.service.delete):
   *  - Producto normal → suma la cantidad acreditada al stock (Product.amount).
   *  - Producto de receta (RES) → no tiene stock propio (consume ingredientes):
   *    se restauran los ingredientes con `RecipeService.restoreIngredients`
   *    (misma lógica que al eliminar un detalle de factura; soporta recetas
   *    anidadas).
   *  - Accommodation → vuelve a estado "Disponible".
   *  - Excursión (servicio) → no aplica.
   * Best-effort: la nota crédito ya es válida ante la DIAN; un fallo aquí solo
   * se loguea (no se revierte la emisión).
   */
  private async reverseInventory(
    selected: { detail: InvoiceDetaill; quantity: number }[],
  ): Promise<void> {
    // Productos de receta a restaurar: se procesan FUERA de la transacción
    // porque RecipeService usa su propio repositorio (igual que invoice.delete).
    const recipeItemsToRestore: { productId: number; quantity: number }[] = [];
    try {
      // Atómico: o se aplican todas las reversiones (stock + estados) o ninguna.
      // No es idempotente por sí mismo, pero el dedupe/lock garantizan que esta
      // reversión corre una sola vez por nota crédito.
      await this.creditNoteRepository.manager.transaction(async (manager) => {
        const accommodationsToUpdate: object[] = [];

        let disponibleState: StateType | null = null;
        if (selected.some((s) => s.detail.accommodation)) {
          disponibleState = await manager
            .getRepository(StateType)
            .createQueryBuilder('s')
            .where(`s.name->>'es' IN (:...names)`, {
              names: ['Disponible', 'DISPONIBLE'],
            })
            .getOne();
        }

        for (const { detail, quantity } of selected) {
          if (detail.product) {
            const categoryCode =
              detail.product.categoryType?.code?.toUpperCase() ?? '';
            if (RECIPE_CATEGORY_CODES.includes(categoryCode)) {
              recipeItemsToRestore.push({
                productId: detail.product.productId,
                quantity,
              });
              continue;
            }
            await manager.increment(
              Product,
              { productId: detail.product.productId },
              'amount',
              quantity,
            );
          } else if (detail.accommodation && disponibleState) {
            detail.accommodation.stateType = disponibleState;
            accommodationsToUpdate.push(detail.accommodation);
          }
        }

        if (accommodationsToUpdate.length) {
          await manager.save(accommodationsToUpdate);
        }
      });

      // Tras confirmar el stock/estados, restaura ingredientes de los platos
      // (RES). Solo corre si la transacción no falló.
      for (const { productId, quantity } of recipeItemsToRestore) {
        await this.recipeService.restoreIngredients(productId, quantity);
      }

      this.logger.log(
        `Inventario revertido por la nota crédito (${selected.length} ítem(s)` +
          `${recipeItemsToRestore.length ? `, ${recipeItemsToRestore.length} de receta` : ''}).`,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo revertir el inventario de la nota crédito: ${
          (error as Error).message
        }`,
      );
    }
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private async createAndValidate(
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const response = await this.factusClient.post<unknown>(
        '/v2/credit-notes/validate',
        payload,
      );
      this.logger.log(
        `Nota crédito creada: ${String(payload.reference_code)}`,
      );
      return response;
    } catch (error) {
      if (error instanceof FactusApiError) {
        if (error.statusCode === 409) {
          throw new ConflictException(
            'Hay una nota crédito pendiente por enviar a la DIAN con este reference_code. ' +
              'Elimínala desde el portal de Factus antes de crear una nueva.',
          );
        }
        if (error.statusCode === 422) {
          const errs = (error.responseData as any)?.errors ?? {};
          const messages = Object.entries(errs).flatMap(([field, msgs]) =>
            (msgs as string[]).map((m) => `${field}: ${m}`),
          );
          throw new UnprocessableEntityException({
            message: 'Error de validación en Factus (nota crédito)',
            errors: messages.length ? messages : [String((error.responseData as any)?.message ?? '')],
          });
        }
      }
      throw error;
    }
  }

  private extractResult(
    raw: any,
    referenceCode: string,
    total: number,
  ): FactusCreditNoteResult {
    const note = raw?.data?.credit_note ?? raw?.data ?? raw;
    return {
      number: note?.number ?? null,
      referenceCode: note?.reference_code ?? referenceCode,
      isValidated: note?.is_validated ?? false,
      cude: note?.cude ?? note?.cufe ?? null,
      qrCode: note?.links?.qr ?? note?.qr_code ?? null,
      publicUrl: note?.links?.public_url ?? null,
      total: total.toFixed(2),
      createdAt: note?.created_at ?? new Date().toISOString(),
    };
  }

  private async persist(
    invoice: Invoice,
    data: {
      referenceCode: string;
      correctionConceptCode: string;
      isTotal: boolean;
      observation: string;
      result: FactusCreditNoteResult;
      selection: { invoiceDetailId: number; quantity: number }[];
    },
  ): Promise<void> {
    const note = this.creditNoteRepository.create({
      invoiceId: invoice.invoiceId,
      referenceCode: data.referenceCode,
      correctionConceptCode: data.correctionConceptCode,
      isTotal: data.isTotal,
      factusNumber: data.result.number ?? undefined,
      factusCude: data.result.cude ?? undefined,
      factusQrCode: data.result.qrCode ?? undefined,
      factusPublicUrl: data.result.publicUrl ?? undefined,
      total: data.result.total,
      observation: data.observation || undefined,
      // Guarda la SELECCIÓN ({invoiceDetailId, quantity}) — base del "restante".
      itemsSnapshot: data.selection,
    });
    await this.creditNoteRepository.save(note);
    this.logger.log(
      `Nota crédito ${data.result.number ?? data.referenceCode} guardada para la factura ${invoice.invoiceId}.`,
    );
  }

  private async loadInvoice(invoiceId: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceId },
      relations: [
        'user',
        'user.identificationType',
        'organizational',
        'payType',
        'invoiceDetails',
        'invoiceDetails.product',
        'invoiceDetails.product.categoryType',
        'invoiceDetails.product.taxeType',
        'invoiceDetails.accommodation',
        'invoiceDetails.accommodation.taxeType',
        'invoiceDetails.accommodation.stateType',
        'invoiceDetails.excursion',
        'invoiceDetails.excursion.taxeType',
        'invoiceDetails.taxeType',
      ],
    });
    if (!invoice) {
      throw new NotFoundException(`Factura ${invoiceId} no encontrada`);
    }
    return invoice;
  }
}
