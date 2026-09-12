import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InvoiceRepository } from '../../shared/repositories/invoice.repository';
import { AdjustmentNoteRepository } from '../../shared/repositories/adjustmentNote.repository';
import { Invoice } from '../../shared/entities/invoice.entity';
import { InvoiceDetaill } from '../../shared/entities/invoiceDetaill.entity';
import { AdjustmentNote } from '../../shared/entities/adjustmentNote.entity';
import { Product } from '../../shared/entities/product.entity';
import { FactusClient } from '../factus.client';
import { FactusApiError } from '../errors/factus-api.error';
import { FactusBillsService } from './factus-bills.service';
import { FactusInvoiceService } from './factus-invoice.service';
import { FactusSupportDocumentService } from './factus-support-document.service';
import {
  AdjustmentNoteItemSelection,
  CreateAdjustmentNoteOptions,
  FactusAdjustmentNoteResult,
} from '../interfaces/adjustment-note.interfaces';
import { sumFactusItemsTotal } from '../utils/factus-math.utils';
import { resolveFactusPayment } from '../utils/factus-payment.utils';
import { createHash } from 'crypto';

/** Motivos DIAN de la nota de ajuste a documento soporte. */
const ADJUSTMENT_CONCEPTS: Record<string, string> = {
  '1': 'Devolución parcial de los bienes y/o no aceptación parcial del servicio',
  '2': 'Anulación del documento soporte',
  '3': 'Rebaja o descuento parcial o total',
  '4': 'Ajuste de precio',
  '5': 'Otros',
};

const DEDUP_WINDOW_MS = 2 * 60 * 1000;

/**
 * Nota de ajuste a DOCUMENTO SOPORTE (Factus / DIAN).
 *
 * Es a los documentos soporte lo que la nota crédito es a las facturas: el único
 * modo de corregir o anular uno ya validado. Comparte con ella el lock por
 * documento, el dedupe por contenido, el tope de sobre-ajuste y la exigencia de
 * `is_validated === true`.
 *
 * ⚠️ **El inventario se mueve al revés que en la nota crédito.** Un documento
 * soporte respalda una COMPRA, que sumó stock al recibirse; ajustarla lo
 * devuelve, así que aquí se **resta**. Es la misma dirección que ya usa
 * `invoice.service.delete()` para las compras (`delta: -detailAmount`). Copiar
 * el `increment` de la nota crédito inflaría el inventario con mercancía que se
 * acaba de declarar no comprada.
 */
@Injectable()
export class FactusAdjustmentNoteService {
  private readonly logger = new Logger(FactusAdjustmentNoteService.name);

  private readonly invoiceLocks = new Map<number, Promise<void>>();

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly adjustmentNoteRepository: AdjustmentNoteRepository,
    private readonly factusClient: FactusClient,
    private readonly billsService: FactusBillsService,
    private readonly invoiceService: FactusInvoiceService,
    private readonly supportDocumentService: FactusSupportDocumentService,
  ) {}

  /** Notas de ajuste ya emitidas sobre una compra (más recientes primero). */
  async listForInvoice(invoiceId: number): Promise<AdjustmentNote[]> {
    return this.adjustmentNoteRepository.find({
      where: { invoiceId },
      order: { createdAt: 'DESC' },
    });
  }

  async createForInvoice(
    invoiceId: number,
    options: CreateAdjustmentNoteOptions,
  ): Promise<FactusAdjustmentNoteResult> {
    return this.withInvoiceLock(invoiceId, () =>
      this.doCreateForInvoice(invoiceId, options),
    );
  }

  private async doCreateForInvoice(
    invoiceId: number,
    options: CreateAdjustmentNoteOptions,
  ): Promise<FactusAdjustmentNoteResult> {
    const invoice = await this.loadInvoice(invoiceId);

    if (!invoice.factusNumber) {
      throw new BadRequestException(
        'Solo se puede generar una nota de ajuste sobre un documento soporte ya emitido a la DIAN.',
      );
    }

    const isTotal = !!options.isTotal;
    const correctionConceptCode =
      options.correctionConceptCode ?? (isTotal ? '2' : '1');
    if (!ADJUSTMENT_CONCEPTS[correctionConceptCode]) {
      throw new BadRequestException(
        `Motivo de nota de ajuste inválido: "${correctionConceptCode}". ` +
          `Válidos: ${Object.entries(ADJUSTMENT_CONCEPTS)
            .map(([c, d]) => `${c} (${d})`)
            .join(', ')}.`,
      );
    }

    const activeDetails = (invoice.invoiceDetails ?? []).filter(
      (d) => !d.deletedAt,
    );
    if (activeDetails.length === 0) {
      throw new BadRequestException('El documento soporte no tiene ítems.');
    }

    const existingNotes = await this.adjustmentNoteRepository.find({
      where: { invoiceId },
    });

    // Tope de sobre-ajuste: la suma de todas las notas no puede exceder lo
    // realmente soportado, igual que en las notas crédito.
    const alreadyAdjusted = this.getAdjustedQuantities(existingNotes);
    const remainingOf = (d: InvoiceDetaill): number =>
      Number(d.amount ?? 1) - (alreadyAdjusted.get(d.invoiceDetailId) ?? 0);

    let selected: { detail: InvoiceDetaill; quantity: number }[];
    if (isTotal) {
      selected = activeDetails
        .map((detail) => ({ detail, quantity: remainingOf(detail) }))
        .filter((s) => s.quantity > 0);
      if (selected.length === 0) {
        throw new BadRequestException(
          'El documento soporte ya fue ajustado en su totalidad.',
        );
      }
    } else {
      const selections = options.items ?? [];
      if (selections.length === 0) {
        throw new BadRequestException(
          'Una nota de ajuste parcial requiere al menos un ítem.',
        );
      }
      selected = selections.map((sel: AdjustmentNoteItemSelection) => {
        const detail = activeDetails.find(
          (d) => d.invoiceDetailId === sel.invoiceDetailId,
        );
        if (!detail) {
          throw new BadRequestException(
            `El ítem ${sel.invoiceDetailId} no pertenece al documento soporte.`,
          );
        }
        const remaining = remainingOf(detail);
        const quantity = sel.quantity != null ? Number(sel.quantity) : remaining;
        if (!(quantity > 0) || quantity > remaining) {
          throw new BadRequestException(
            `Cantidad inválida para el ítem ${sel.invoiceDetailId} ` +
              `(disponible para ajustar: ${remaining}).`,
          );
        }
        return { detail, quantity };
      });
    }

    const selection = selected.map((s) => ({
      invoiceDetailId: s.detail.invoiceDetailId,
      quantity: s.quantity,
    }));
    const requestHash = this.computeRequestHash(
      isTotal,
      correctionConceptCode,
      selection,
    );

    const duplicate = existingNotes.find(
      (n) =>
        Date.now() - new Date(n.createdAt).getTime() < DEDUP_WINDOW_MS &&
        this.noteHash(n) === requestHash,
    );
    if (duplicate) {
      this.logger.warn(
        `Nota de ajuste duplicada en la compra ${invoiceId} (reintento dentro de ` +
          `${DEDUP_WINDOW_MS / 1000}s): se devuelve la existente ` +
          `${duplicate.factusNumber ?? duplicate.referenceCode} sin reemitir.`,
      );
      return this.resultFromNote(duplicate);
    }

    // Proveedor e ítems se arman con la MISMA lógica del documento soporte
    // (validación de tipo de identificación incluida: nada de cédula) para que
    // el ajuste no pueda salir con datos que el documento original no admitía.
    const provider = this.supportDocumentService.buildProviderFor(invoice);
    const items = selected.map(({ detail, quantity }) =>
      this.supportDocumentService.buildItemFor(invoice, detail, quantity),
    );

    const total = sumFactusItemsTotal(items as any);
    const payment = resolveFactusPayment(invoice.payType?.code);

    const numberingRangeId = await this.billsService.resolveNumberingRangeId(
      'adjustmentNote',
      invoice.organizational?.factusNumberingRangeIdAdjustment,
    );

    const referenceCode = `NA-${invoice.code}-${Date.now()}`;
    const observation = (options.observation ?? '').slice(0, 250);

    const payload: Record<string, unknown> = {
      reference_code: referenceCode,
      numbering_range_id: numberingRangeId,
      // El documento ajustado se referencia por NÚMERO, no por id.
      support_document_number: invoice.factusNumber,
      correction_concept_code: correctionConceptCode,
      observation,
      payment_details: [
        {
          payment_form: payment.form,
          payment_method_code: payment.method,
          amount: total.toFixed(2),
        },
      ],
      cash_rounding_amount: '0.00',
      provider,
      items,
    };

    const raw = await this.createAndValidate(payload);
    const result = this.extractResult(raw, referenceCode, total);

    // Igual que en la nota crédito, aquí importa doblemente: lo que sigue es
    // persistir y MOVER INVENTARIO. Hacerlo sobre una nota que la DIAN rechazó
    // dejaría el stock descuadrado por un ajuste que legalmente no existe.
    if (result.isValidated !== true) {
      const errors = this.extractNoteErrors(raw);
      const rejected = errors.some((e) => /rechazo/i.test(e));
      this.logger.error(
        `Nota de ajuste ${referenceCode} de la compra ${invoice.invoiceId}: ` +
          `is_validated=false (${rejected ? 'RECHAZO' : 'pendiente en la DIAN'}). ` +
          `No se persiste ni se toca inventario. errors=${JSON.stringify(errors)}`,
      );
      throw new UnprocessableEntityException({
        message: rejected
          ? 'La DIAN rechazó la nota de ajuste. No quedó emitida y no se movió inventario.'
          : 'La DIAN aún no ha validado la nota de ajuste. No se emitió todavía.',
        pendingInDian: !rejected,
        rejected,
        referenceCode,
        noteNumber: result.number,
        errors,
        hint: rejected
          ? `Elimínala con DELETE /factus/adjustment-notes/by-reference/${referenceCode}, corrige y reenvía.`
          : 'No elimines nada. Reintenta más tarde con los MISMOS datos.',
      });
    }

    await this.persist(invoice, {
      referenceCode,
      correctionConceptCode,
      isTotal,
      observation,
      result,
      selection,
    });

    await this.reverseInventory(selected);

    return result;
  }

  /**
   * Elimina en Factus una nota de ajuste NO VALIDADA.
   *
   * ⚠️ Esta ruta va por **`/v1/`**, no por `/v2/` como todo lo demás del
   * sistema. Está así en la documentación oficial y es la única excepción;
   * copiar el patrón de los otros documentos la rompe con un 404.
   */
  async deleteByReference(referenceCode: string): Promise<unknown> {
    try {
      const res = await this.factusClient.delete<unknown>(
        `/v1/adjustment-notes/reference/${encodeURIComponent(referenceCode)}`,
      );
      this.logger.warn(
        `Nota de ajuste con reference_code "${referenceCode}" eliminada en Factus.`,
      );
      return res;
    } catch (error) {
      if (error instanceof FactusApiError) {
        const detail =
          (error.responseData as any)?.message ?? `HTTP ${error.statusCode}`;
        throw new BadRequestException(
          `No se pudo eliminar en Factus la nota de ajuste "${referenceCode}": ` +
            `${detail}. Solo se pueden eliminar notas NO validadas por la DIAN.`,
        );
      }
      throw error;
    }
  }

  // ── Inventario ────────────────────────────────────────────────────────────

  /**
   * Deshace el efecto de la compra por lo ajustado: **resta** del stock lo que
   * el documento soporte había sumado. Misma dirección que
   * `invoice.service.delete()` para compras.
   *
   * Best-effort, como en la nota crédito: la nota ya es válida ante la DIAN, así
   * que un fallo aquí solo se registra; revertir la emisión no es posible.
   */
  private async reverseInventory(
    selected: { detail: InvoiceDetaill; quantity: number }[],
  ): Promise<void> {
    try {
      await this.adjustmentNoteRepository.manager.transaction(
        async (manager) => {
          for (const { detail, quantity } of selected) {
            if (!detail.product) continue;
            // Las recetas (RES) no aplican: una compra repone ingredientes, no
            // produce platos, así que no hay nada que "despreparar".
            await manager.decrement(
              Product,
              { productId: detail.product.productId },
              'amount',
              quantity,
            );
          }
        },
      );

      const negativos = selected.filter(
        (s) => s.detail.product && Number(s.detail.product.amount ?? 0) < s.quantity,
      );
      if (negativos.length) {
        this.logger.warn(
          `La nota de ajuste deja ${negativos.length} producto(s) con stock por ` +
            'debajo de cero: la mercancía de esa compra ya se había vendido o ' +
            'consumido. Hay que cuadrarlo a mano.',
        );
      }

      this.logger.log(
        `Inventario descontado por la nota de ajuste (${selected.length} ítem(s)).`,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo descontar el inventario de la nota de ajuste: ${
          (error as Error).message
        }`,
      );
    }
  }

  // ── Concurrencia e idempotencia ───────────────────────────────────────────

  private async withInvoiceLock<T>(
    invoiceId: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = this.invoiceLocks.get(invoiceId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));
    const tail = previous.then(() => current);
    this.invoiceLocks.set(invoiceId, tail);

    await previous.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
      if (this.invoiceLocks.get(invoiceId) === tail) {
        this.invoiceLocks.delete(invoiceId);
      }
    }
  }

  private getAdjustedQuantities(notes: AdjustmentNote[]): Map<number, number> {
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

  private computeRequestHash(
    isTotal: boolean,
    conceptCode: string,
    selection: { invoiceDetailId: number; quantity: number }[],
  ): string {
    const normalized = [...selection].sort(
      (a, b) => a.invoiceDetailId - b.invoiceDetailId,
    );
    return createHash('sha1')
      .update(JSON.stringify({ isTotal, conceptCode, selection: normalized }))
      .digest('hex');
  }

  private noteHash(note: AdjustmentNote): string {
    const snapshot = (note.itemsSnapshot ?? []) as {
      invoiceDetailId: number;
      quantity: number;
    }[];
    return this.computeRequestHash(
      note.isTotal,
      note.correctionConceptCode,
      Array.isArray(snapshot) ? snapshot : [],
    );
  }

  private resultFromNote(note: AdjustmentNote): FactusAdjustmentNoteResult {
    return {
      number: note.factusNumber ?? null,
      referenceCode: note.referenceCode,
      isValidated: true,
      cuds: note.factusCuds ?? null,
      qrCode: note.factusQrCode ?? null,
      publicUrl: note.factusPublicUrl ?? null,
      total: note.total,
      createdAt: new Date(note.createdAt).toISOString(),
    };
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private async createAndValidate(
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const response = await this.factusClient.post<unknown>(
        '/v2/adjustment-notes/validate',
        payload,
      );
      this.logger.log(
        `Nota de ajuste creada: ${String(payload.reference_code)}`,
      );
      return response;
    } catch (error) {
      if (error instanceof FactusApiError) {
        if (error.statusCode === 409) {
          const ref = String(payload.reference_code);
          throw new ConflictException(
            'Factus tiene una nota de ajuste pendiente por enviar a la DIAN con ' +
              `el reference_code "${ref}". Mientras siga ahí bloquea los envíos. ` +
              `Elimínala con DELETE /factus/adjustment-notes/by-reference/${ref} y ` +
              'reintenta con el MISMO código: Factus deduplica por él.',
          );
        }
        if (error.statusCode === 422) {
          const errs = (error.responseData as any)?.errors ?? {};
          const messages = Object.entries(errs).flatMap(([field, msgs]) =>
            (msgs as string[]).map((m) => `${field}: ${m}`),
          );
          throw new UnprocessableEntityException({
            message: 'Error de validación en Factus (nota de ajuste)',
            errors: messages.length
              ? messages
              : [String((error.responseData as any)?.message ?? '')],
          });
        }
      }
      throw error;
    }
  }

  private extractNoteErrors(raw: any): string[] {
    const note = raw?.data?.adjustment_note ?? raw?.data ?? raw;
    const errors = note?.errors;
    if (!errors) return [];
    if (Array.isArray(errors)) return errors.map((e) => String(e));
    if (typeof errors === 'object') return Object.values(errors).map(String);
    return [String(errors)];
  }

  private extractResult(
    raw: any,
    referenceCode: string,
    total: number,
  ): FactusAdjustmentNoteResult {
    const note = raw?.data?.adjustment_note ?? raw?.data ?? raw;
    return {
      number: note?.number ?? null,
      referenceCode: note?.reference_code ?? referenceCode,
      isValidated: note?.is_validated ?? false,
      cuds: note?.cuds ?? note?.cude ?? note?.cufe ?? null,
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
      result: FactusAdjustmentNoteResult;
      selection: { invoiceDetailId: number; quantity: number }[];
    },
  ): Promise<void> {
    const note = this.adjustmentNoteRepository.create({
      invoiceId: invoice.invoiceId,
      referenceCode: data.referenceCode,
      correctionConceptCode: data.correctionConceptCode,
      isTotal: data.isTotal,
      supportDocumentNumber: invoice.factusNumber!,
      factusNumber: data.result.number ?? undefined,
      factusCuds: data.result.cuds ?? undefined,
      factusQrCode: data.result.qrCode ?? undefined,
      factusPublicUrl: data.result.publicUrl ?? undefined,
      total: data.result.total,
      observation: data.observation || undefined,
      itemsSnapshot: data.selection,
    });
    await this.adjustmentNoteRepository.save(note);
    this.logger.log(
      `Nota de ajuste ${data.result.number ?? data.referenceCode} guardada para la compra ${invoice.invoiceId}.`,
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
        'invoiceType',
        'invoiceDetails',
        'invoiceDetails.product',
        'invoiceDetails.product.categoryType',
        'invoiceDetails.product.taxeType',
        'invoiceDetails.taxeType',
      ],
    });
    if (!invoice) {
      throw new NotFoundException(`Compra ${invoiceId} no encontrada`);
    }
    return invoice;
  }
}
