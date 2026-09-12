import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InvoiceRepository } from '../../shared/repositories/invoice.repository';
import { DebitNoteRepository } from '../../shared/repositories/debitNote.repository';
import { Invoice } from '../../shared/entities/invoice.entity';
import { DebitNote } from '../../shared/entities/debitNote.entity';
import { FactusClient } from '../factus.client';
import { FactusApiError } from '../errors/factus-api.error';
import { FactusBillsService } from './factus-bills.service';
import { FactusInvoiceService } from './factus-invoice.service';
import { MailsService } from '../../shared/services/mails.service';
import { MailAttachment } from '../../shared/interfaces/mail.interface';
import {
  CreateDebitNoteOptions,
  DebitNoteItemInput,
  FactusDebitNoteResult,
} from '../interfaces/debit-note.interfaces';
import { sumFactusItemsTotal } from '../utils/factus-math.utils';
import { resolveFactusPayment } from '../utils/factus-payment.utils';
import * as QRCode from 'qrcode';
import { createHash } from 'crypto';

/** Conceptos DIAN válidos para nota débito (tabla de códigos de corrección). */
const DEBIT_CONCEPTS: Record<string, string> = {
  '1': 'Intereses',
  '2': 'Gastos por cobrar',
  '3': 'Cambio del valor',
  '4': 'Otros',
};

/**
 * Ventana para considerar dos solicitudes como la MISMA (doble click / reintento
 * por respuesta perdida). Igual criterio que en notas crédito.
 */
const DEDUP_WINDOW_MS = 2 * 60 * 1000;

/**
 * Nota débito electrónica (Factus / DIAN) sobre una factura electrónica de venta.
 *
 * Es la simétrica de la nota crédito y comparte sus garantías —lock por factura,
 * dedupe por contenido, `is_validated === true` obligatorio, rango de numeración
 * explícito—, pero con dos diferencias de fondo:
 *
 *  - **No revierte inventario.** No devuelve mercancía: cobra de más. Copiar
 *    aquí el `reverseInventory` de la nota crédito descuadraría el stock en
 *    sentido contrario, inflándolo por un cobro que no devolvió nada.
 *  - **No anula.** Sus conceptos son intereses, gastos por cobrar, cambio del
 *    valor y otros. Para anular una factura la figura es la nota crédito.
 */
@Injectable()
export class FactusDebitNoteService {
  private readonly logger = new Logger(FactusDebitNoteService.name);

  // Serializa la emisión por factura dentro de la instancia (doble-submit).
  // En memoria → válido con UNA instancia, igual que el token de Factus y los
  // locks de notas crédito y documento soporte. Si se escala, mover a Redis.
  private readonly invoiceLocks = new Map<number, Promise<void>>();

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly debitNoteRepository: DebitNoteRepository,
    private readonly factusClient: FactusClient,
    private readonly billsService: FactusBillsService,
    private readonly invoiceService: FactusInvoiceService,
    private readonly mailsService: MailsService,
  ) {}

  /** Notas débito ya emitidas de una factura (más recientes primero). */
  async listForInvoice(invoiceId: number): Promise<DebitNote[]> {
    return this.debitNoteRepository.find({
      where: { invoiceId },
      order: { createdAt: 'DESC' },
    });
  }

  async createForInvoice(
    invoiceId: number,
    options: CreateDebitNoteOptions,
  ): Promise<FactusDebitNoteResult> {
    return this.withInvoiceLock(invoiceId, () =>
      this.doCreateForInvoice(invoiceId, options),
    );
  }

  private async doCreateForInvoice(
    invoiceId: number,
    options: CreateDebitNoteOptions,
  ): Promise<FactusDebitNoteResult> {
    const invoice = await this.loadInvoice(invoiceId);

    if (!invoice.factusNumber) {
      throw new BadRequestException(
        'Solo se puede generar una nota débito sobre una factura electrónica ya emitida a la DIAN.',
      );
    }

    const correctionConceptCode = options.correctionConceptCode ?? '1';
    if (!DEBIT_CONCEPTS[correctionConceptCode]) {
      throw new BadRequestException(
        `Concepto de nota débito inválido: "${correctionConceptCode}". ` +
          `Válidos: ${Object.entries(DEBIT_CONCEPTS)
            .map(([c, d]) => `${c} (${d})`)
            .join(', ')}. ` +
          'Ojo: la nota débito NO tiene concepto de anulación; para anular una ' +
          'factura se emite una nota crédito.',
      );
    }

    const inputs = options.items ?? [];
    if (inputs.length === 0) {
      throw new BadRequestException(
        'Una nota débito requiere al menos un concepto a cobrar.',
      );
    }

    const items = inputs.map((input, index) => this.mapItem(input, index));

    // Total con el redondeo por línea de Factus, igual que en el resto de
    // documentos (si no, 422 por descuadre de payment_details).
    const total = sumFactusItemsTotal(items as any);

    const requestHash = this.computeRequestHash(correctionConceptCode, items);

    // Dedupe idempotente: una solicitud idéntica emitida hace muy poco devuelve
    // la nota ya creada en vez de emitir una segunda ante la DIAN.
    const existing = await this.debitNoteRepository.find({
      where: { invoiceId },
    });
    const duplicate = existing.find(
      (n) =>
        Date.now() - new Date(n.createdAt).getTime() < DEDUP_WINDOW_MS &&
        this.noteHash(n) === requestHash,
    );
    if (duplicate) {
      this.logger.warn(
        `Nota débito duplicada en la factura ${invoiceId} (reintento dentro de ` +
          `${DEDUP_WINDOW_MS / 1000}s): se devuelve la existente ` +
          `${duplicate.factusNumber ?? duplicate.referenceCode} sin reemitir.`,
      );
      return this.resultFromNote(duplicate);
    }

    const customer = this.invoiceService.buildCustomer(invoice);
    const payment = resolveFactusPayment(invoice.payType?.code);

    // Rango explícito, igual que factura, nota crédito y documento soporte.
    const numberingRangeId = await this.billsService.resolveNumberingRangeId(
      'debitNote',
      invoice.organizational?.factusNumberingRangeIdDebitNote,
    );

    const referenceCode = `ND-${invoice.code}-${Date.now()}`;
    const observation = (options.observation ?? '').slice(0, 250);

    const payload: Record<string, unknown> = {
      reference_code: referenceCode,
      numbering_range_id: numberingRangeId,
      correction_concept_code: correctionConceptCode,
      // customization_id por defecto 30 (nota débito CON referencia a factura)
      // → se omite. El 32 sería sin referencia, que aquí nunca aplica porque
      // siempre partimos de una factura electrónica emitida.
      bill_number: invoice.factusNumber,
      observation,
      payment_details: [
        {
          payment_form: payment.form,
          payment_method_code: payment.method,
          amount: total.toFixed(2),
        },
      ],
      customer,
      items,
    };

    const raw = await this.createAndValidate(payload);
    const result = this.extractResult(raw, referenceCode, total);

    // No se da por emitida si la DIAN no la validó: una nota débito con número
    // pero sin CUDE es un cobro que legalmente no existe, y quedaría sumando en
    // los reportes del negocio.
    if (result.isValidated !== true) {
      const errors = this.extractNoteErrors(raw);
      const rejected = errors.some((e) => /rechazo/i.test(e));
      this.logger.error(
        `Nota débito ${referenceCode} de la factura ${invoice.invoiceId}: ` +
          `is_validated=false (${rejected ? 'RECHAZO' : 'pendiente en la DIAN'}). ` +
          `No se persiste. errors=${JSON.stringify(errors)}`,
      );
      throw new UnprocessableEntityException({
        message: rejected
          ? 'La DIAN rechazó la nota débito. No quedó emitida.'
          : 'La DIAN aún no ha validado la nota débito. No se emitió todavía.',
        pendingInDian: !rejected,
        rejected,
        referenceCode,
        noteNumber: result.number,
        errors,
        hint: rejected
          ? 'Corrige los datos y reenvía con el MISMO reference_code.'
          : 'No elimines nada. Reintenta más tarde con los MISMOS datos.',
      });
    }

    await this.persist(invoice, {
      referenceCode,
      correctionConceptCode,
      observation,
      result,
      items,
    });

    // A diferencia de la nota crédito, aquí NO se toca el inventario: cobrar
    // intereses o gastos no devuelve mercancía a la bodega.

    this.dispatchNotifications(invoice, result);

    return result;
  }

  /** Convierte una línea de entrada al ítem del payload de Factus. */
  private mapItem(
    input: DebitNoteItemInput,
    index: number,
  ): Record<string, unknown> {
    const name = String(input.name ?? '').trim();
    if (!name) {
      throw new BadRequestException(
        `El concepto ${index + 1} de la nota débito no tiene descripción.`,
      );
    }
    const quantity = Number(input.quantity ?? 1);
    const price = Number(input.price);
    if (!(quantity > 0)) {
      throw new BadRequestException(
        `La cantidad del concepto "${name}" debe ser mayor que 0.`,
      );
    }
    if (!(price > 0)) {
      throw new BadRequestException(
        `El valor del concepto "${name}" debe ser mayor que 0.`,
      );
    }
    const taxRate = Number(input.taxRate ?? 0);

    return {
      code_reference: input.codeReference ?? `ND-${index + 1}`,
      name: name.slice(0, 200),
      quantity: quantity.toFixed(2),
      discount_rate: '0.00',
      price: price.toFixed(2),
      unit_measure_code: '94',
      standard_code: '999',
      // El `rate` va como PORCENTAJE ("19.00"), no como fracción.
      taxes: [{ code: input.taxCode ?? '01', rate: taxRate.toFixed(2) }],
    };
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

  private computeRequestHash(
    conceptCode: string,
    items: Record<string, unknown>[],
  ): string {
    const normalized = items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
    }));
    return createHash('sha1')
      .update(JSON.stringify({ conceptCode, items: normalized }))
      .digest('hex');
  }

  private noteHash(note: DebitNote): string {
    const snapshot = (note.itemsSnapshot ?? []) as Record<string, unknown>[];
    return this.computeRequestHash(
      note.correctionConceptCode,
      Array.isArray(snapshot) ? snapshot : [],
    );
  }

  private resultFromNote(note: DebitNote): FactusDebitNoteResult {
    return {
      number: note.factusNumber ?? null,
      referenceCode: note.referenceCode,
      isValidated: true,
      cude: note.factusCude ?? null,
      qrCode: note.factusQrCode ?? null,
      publicUrl: note.factusPublicUrl ?? null,
      total: note.total,
      createdAt: new Date(note.createdAt).toISOString(),
    };
  }

  // ── Notificaciones ────────────────────────────────────────────────────────

  private dispatchNotifications(
    invoice: Invoice,
    result: FactusDebitNoteResult,
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
          `Fallo en notificaciones de la nota débito ${
            result.number ?? result.referenceCode
          }: ${(error as Error).message}`,
        );
      }
    })();
  }

  private async buildAttachments(
    result: FactusDebitNoteResult,
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
          cid: 'qr-nd',
        });
      } catch (error) {
        this.logger.warn(
          `No se pudo generar el QR de la nota débito ${result.number}: ${
            (error as Error).message
          }`,
        );
      }
    }

    if (result.number) {
      const pdf = await this.downloadOfficialPdf(result.number);
      if (pdf) {
        attachments.push({
          filename: `nota-debito-${result.number}.pdf`,
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
        `/v2/debit-notes/${encodeURIComponent(number)}/download-pdf`,
      );
      const base64 =
        res?.data?.pdf_base_64_encoded ?? res?.pdf_base_64_encoded ?? null;
      return base64 ? Buffer.from(base64, 'base64') : null;
    } catch (error) {
      this.logger.warn(
        `No se pudo descargar el PDF oficial de la nota débito ${number}: ${
          (error as Error).message
        }`,
      );
      return null;
    }
  }

  private async notifyCustomer(
    invoice: Invoice,
    result: FactusDebitNoteResult,
    attachments: MailAttachment[],
  ): Promise<void> {
    const to = invoice.user?.email?.trim();
    const isValidEmail = !!to && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to);
    if (!isValidEmail) {
      this.logger.warn(
        `Nota débito ${result.number}: el cliente no tiene email válido; no se envió copia.`,
      );
      return;
    }
    const orgName =
      invoice.organizational?.legalName ?? invoice.organizational?.name ?? '';
    try {
      await this.mailsService.sendEmail({
        to: to!,
        subject: `Nota débito ${result.number ?? result.referenceCode} — ${orgName}`,
        body: this.buildEmailHtml(invoice, result, orgName),
        attachments,
      });
      this.logger.log(
        `Copia de la nota débito ${result.number} enviada al cliente (${to}).`,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo enviar la nota débito ${result.number} al cliente: ${
          (error as Error).message
        }`,
      );
    }
  }

  private async notifyBusiness(
    invoice: Invoice,
    result: FactusDebitNoteResult,
    attachments: MailAttachment[],
  ): Promise<void> {
    // Igual que facturas y notas crédito: la copia al negocio solo en producción.
    if (process.env.APP_ENV !== 'production') return;
    const to = invoice.organizational?.email?.trim();
    if (!to) return;
    const orgName =
      invoice.organizational?.legalName ?? invoice.organizational?.name ?? '';
    try {
      await this.mailsService.sendEmail({
        to,
        subject: `Nota débito ${result.number ?? result.referenceCode} — ${orgName}`,
        body: this.buildEmailHtml(invoice, result, orgName),
        attachments,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar la copia interna de la nota débito ${result.number}: ${
          (error as Error).message
        }`,
      );
    }
  }

  private buildEmailHtml(
    invoice: Invoice,
    result: FactusDebitNoteResult,
    orgName: string,
  ): string {
    const qr = result.qrCode
      ? '<p style="text-align:center"><img src="cid:qr-nd" alt="QR DIAN" width="180" /></p>'
      : '';
    const link = result.publicUrl
      ? `<p style="text-align:center"><a href="${result.publicUrl}">Ver el documento en línea</a></p>`
      : '';
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:600px;margin:0 auto">
        <h2 style="color:#1f5e43">Nota débito ${result.number ?? ''}</h2>
        <p>Se ha emitido una nota débito asociada a la factura
           <strong>${invoice.factusNumber ?? invoice.code}</strong>.</p>
        <p>Una nota débito <strong>aumenta</strong> el valor a pagar de la factura
           referenciada.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:6px 0">Documento</td><td style="text-align:right"><strong>${result.number ?? result.referenceCode}</strong></td></tr>
          <tr><td style="padding:6px 0">Factura referenciada</td><td style="text-align:right">${invoice.factusNumber ?? invoice.code}</td></tr>
          <tr><td style="padding:6px 0">Valor</td><td style="text-align:right"><strong>$ ${result.total}</strong></td></tr>
          <tr><td style="padding:6px 0">CUDE</td><td style="text-align:right;font-size:11px;word-break:break-all">${result.cude ?? ''}</td></tr>
        </table>
        ${qr}
        ${link}
        <p style="font-size:12px;color:#666">${orgName}</p>
      </div>`;
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private async createAndValidate(
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const response = await this.factusClient.post<unknown>(
        '/v2/debit-notes/validate',
        payload,
      );
      this.logger.log(`Nota débito creada: ${String(payload.reference_code)}`);
      return response;
    } catch (error) {
      if (error instanceof FactusApiError) {
        if (error.statusCode === 409) {
          throw new ConflictException(
            'Hay una nota débito pendiente por enviar a la DIAN con este ' +
              'reference_code. Elimínala desde el portal de Factus y reintenta ' +
              'con el MISMO código: Factus deduplica por reference_code, y ' +
              'cambiarlo crea un documento nuevo en vez de reintentar.',
          );
        }
        if (error.statusCode === 422) {
          const errs = (error.responseData as any)?.errors ?? {};
          const messages = Object.entries(errs).flatMap(([field, msgs]) =>
            (msgs as string[]).map((m) => `${field}: ${m}`),
          );
          throw new UnprocessableEntityException({
            message: 'Error de validación en Factus (nota débito)',
            errors: messages.length
              ? messages
              : [String((error.responseData as any)?.message ?? '')],
          });
        }
      }
      throw error;
    }
  }

  /** Normaliza `errors` de Factus: llega como objeto indexado o como array. */
  private extractNoteErrors(raw: any): string[] {
    const note = raw?.data?.debit_note ?? raw?.data ?? raw;
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
  ): FactusDebitNoteResult {
    const note = raw?.data?.debit_note ?? raw?.data ?? raw;
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
      observation: string;
      result: FactusDebitNoteResult;
      items: Record<string, unknown>[];
    },
  ): Promise<void> {
    const note = this.debitNoteRepository.create({
      invoiceId: invoice.invoiceId,
      referenceCode: data.referenceCode,
      correctionConceptCode: data.correctionConceptCode,
      factusNumber: data.result.number ?? undefined,
      factusCude: data.result.cude ?? undefined,
      factusQrCode: data.result.qrCode ?? undefined,
      factusPublicUrl: data.result.publicUrl ?? undefined,
      total: data.result.total,
      observation: data.observation || undefined,
      itemsSnapshot: data.items,
    });
    await this.debitNoteRepository.save(note);
    this.logger.log(
      `Nota débito ${data.result.number ?? data.referenceCode} guardada para la factura ${invoice.invoiceId}.`,
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
      ],
    });
    if (!invoice) {
      throw new NotFoundException(`Factura ${invoiceId} no encontrada`);
    }
    return invoice;
  }
}
