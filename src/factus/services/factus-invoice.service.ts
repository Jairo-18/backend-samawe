import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InvoiceRepository } from '../../shared/repositories/invoice.repository';
import { Invoice } from '../../shared/entities/invoice.entity';
import { InvoiceDetaill } from '../../shared/entities/invoiceDetaill.entity';
import { FactusBillsService } from './factus-bills.service';
import { FactusBillResult } from '../interfaces/bill.interfaces';
import { MailsService } from '../../shared/services/mails.service';
import { InvoicePdfService } from '../../shared/services/invoicePdf.service';
import { InvoiceTypeRepository } from '../../shared/repositories/invoiceType.repository';
import { MailAttachment } from '../../shared/interfaces/mail.interface';
import { sumFactusItemsTotal } from '../utils/factus-math.utils';
import { resolveFactusPayment } from '../utils/factus-payment.utils';
import * as QRCode from 'qrcode';

// Respaldo del código de documento Factus por el `code` del IdentificationType,
// por si la columna factusCode no está poblada (la migración la setea, pero un
// re-seed del catálogo puede dejarla NULL). Evita clasificar mal un NIT como CC.
const FACTUS_ID_CODE_BY_TYPE: Record<string, string> = {
  CC: '13',
  NIT: '31',
  CE: '22',
  PAS: '41',
  TI: '12',
  TE: '21',
  RC: '11',
};

@Injectable()
export class FactusInvoiceService {
  private readonly logger = new Logger(FactusInvoiceService.name);

  // Cache de InvoiceType por code. La tabla es un catálogo semilla que no
  // cambia en caliente, así que basta con resolverlo una vez por proceso.
  private readonly invoiceTypeIdByCode = new Map<string, number>();

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly billsService: FactusBillsService,
    private readonly mailsService: MailsService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly invoiceTypeRepository: InvoiceTypeRepository,
  ) {}

  /**
   * Resuelve el id de un InvoiceType por su `code` ('FV', 'FVE'…).
   *
   * Antes estos ids iban hardcodeados y uno estaba MAL: `resetFactusFields`
   * usaba 3 "porque el 3 es FV", pero en la base de producción el 3 es CO
   * (Cotización) y FV es 1 — resetear una factura la convertía en cotización.
   * Los ids los asigna un SERIAL al sembrar el catálogo, así que dependen del
   * orden en que se creó cada base y no se pueden dar por supuestos.
   */
  private async resolveInvoiceTypeId(code: string): Promise<number> {
    const cached = this.invoiceTypeIdByCode.get(code);
    if (cached) return cached;

    const type = await this.invoiceTypeRepository.findOne({ where: { code } });
    if (!type) {
      throw new BadRequestException(
        `No existe un InvoiceType con code "${code}" en la base de datos. ` +
          'Revisa el catálogo InvoiceType antes de emitir.',
      );
    }
    this.invoiceTypeIdByCode.set(code, type.invoiceTypeId);
    return type.invoiceTypeId;
  }

  async sendInvoiceToFactus(invoiceId: number): Promise<FactusBillResult> {
    const invoice = await this.loadInvoice(invoiceId);

    // If already sent, return stored data without re-sending
    if (invoice.factusNumber) {
      this.logger.log(
        `Invoice ${invoiceId} already sent to Factus: ${invoice.factusNumber}`,
      );
      return {
        billNumber: invoice.factusNumber,
        referenceCode: invoice.code,
        isValidated: true,
        cufe: invoice.factusCufe ?? null,
        qrCode: invoice.factusQrCode ?? null,
        publicUrl: invoice.factusPublicUrl ?? null,
        createdAt:
          invoice.factusSentAt?.toISOString() ??
          invoice.createdAt.toISOString(),
      };
    }

    this.validateInvoiceForFactus(invoice);

    const numberingRangeId = await this.billsService.resolveNumberingRangeId(
      'sales',
      invoice.organizational?.factusNumberingRangeId,
    );
    const payload = this.buildPayload(invoice, numberingRangeId);

    // Un solo intento, con el reference_code de la factura y sin sufijos.
    //
    // Factus deduplica por reference_code: reenviar el MISMO código es la forma
    // oficial de reintentar (devuelve la factura existente y consulta su estado
    // en la DIAN). El código anterior hacía lo contrario — ante un 409 o una
    // Regla 90 reintentaba hasta 6 veces con sufijos -v2/-v3, y cada sufijo es
    // un documento NUEVO para Factus. Eso no resuelve el bloqueo (el documento
    // atascado sigue ahí) y multiplica los documentos pendientes. Fue lo que
    // dejó la facturación de producción caída con la factura A773.
    //
    // El 409 lo traduce createAndValidateBill a un mensaje que explica que hay
    // que ELIMINAR el documento atascado por su referencia y reintentar igual.
    const raw = await this.billsService.createAndValidateBill(payload);

    const result = this.extractResult(raw);

    // Solo damos la factura por emitida si la DIAN la validó de verdad.
    //
    // `is_validated: false` tiene dos causas muy distintas y hay que separarlas
    // (ver "Manejo de respuestas" en la doc de Factus):
    //   · con "Rechazo" en errors → la DIAN la rechazó. Hay que eliminarla en
    //     Factus, corregir y reenviar. Si no se elimina, bloquea los envíos.
    //   · sin "Rechazo" → la DIAN solo está demorada. NO eliminar: reenviar
    //     más tarde con los mismos datos y Factus reconcilia el estado.
    // En ninguno de los dos casos se persiste número/CUFE ni se marca la
    // factura como electrónica: hacerlo dejaba facturas "emitidas" sin CUFE.
    if (result.isValidated !== true) {
      const errors = this.extractErrors(raw);
      const rejected = FactusInvoiceService.looksRejected(errors);
      this.logger.error(
        `Factura ${invoiceId}: Factus la registró como ${result.billNumber ?? 's/n'} ` +
          `pero is_validated=false (${rejected ? 'RECHAZO' : 'pendiente en la DIAN'}). ` +
          `errors=${JSON.stringify(errors)}`,
      );
      throw new UnprocessableEntityException({
        message: rejected
          ? 'La DIAN rechazó la factura. No quedó emitida.'
          : 'La DIAN aún no ha validado la factura. No quedó emitida todavía.',
        pendingInDian: !rejected,
        rejected,
        billNumber: result.billNumber,
        referenceCode: invoice.code,
        errors,
        hint: rejected
          ? `Elimina el documento en Factus (DELETE /factus/invoices/by-reference/${invoice.code}), ` +
            'corrige los datos y vuelve a enviarla con el MISMO código.'
          : 'No elimines nada. Reintenta más tarde con POST :id/send: Factus consultará ' +
            'el estado en la DIAN y lo actualizará sin duplicar el documento.',
      });
    }

    invoice.factusReferenceCode = invoice.code;
    await this.saveFactusResult(invoice, result);

    // La factura ya quedó válida ante la DIAN y guardada (número + CUFE + QR).
    // Los adjuntos (QR + PDF) y los correos son "best-effort" y NO afectan la
    // validez fiscal, así que los disparamos en segundo plano: el usuario solo
    // espera la emisión DIAN, no la generación del PDF (sharp/pdfmake) ni los
    // envíos SMTP, que sumaban varios segundos al request.
    this.dispatchPostEmissionNotifications(invoice, result);

    return result;
  }

  /**
   * Tareas posteriores a la emisión, ejecutadas en segundo plano (no bloquean
   * la respuesta ni afectan la validez fiscal de la factura):
   *  - Construye los adjuntos (QR inline + PDF branded) una sola vez.
   *  - Envía las copias al cliente y al negocio EN PARALELO.
   * Todo best-effort: notifyCustomer/notifyBusiness ya capturan sus propios
   * errores; el try/catch externo es defensivo para evitar unhandled rejections
   * (p. ej. si fallara la generación de adjuntos).
   */
  private dispatchPostEmissionNotifications(
    invoice: Invoice,
    result: FactusBillResult,
  ): void {
    void (async () => {
      try {
        const attachments = await this.buildInvoiceAttachments(invoice, result);
        await Promise.allSettled([
          this.notifyCustomer(invoice, result, attachments),
          this.notifyBusiness(invoice, result, attachments),
        ]);
      } catch (error) {
        this.logger.error(
          `Fallo en las notificaciones posteriores a la emisión de la factura ${invoice.invoiceId}: ${
            (error as Error).message
          }`,
        );
      }
    })();
  }

  /**
   * Construye los adjuntos de la factura electrónica para los correos:
   *  - QR de la DIAN como imagen PNG inline (cid:qr-dian). factusQrCode guarda
   *    la URL de verificación DIAN (el CONTENIDO del QR), no una imagen, por eso
   *    la generamos nosotros; además el inline (cid) sí lo renderiza Gmail,
   *    mientras que un <img src> a data-uri/URL externa suele bloquearse.
   *  - PDF oficial de la factura descargado desde Factus.
   * Todo best-effort: si algo falla, se omite ese adjunto sin romper el envío.
   */
  private async buildInvoiceAttachments(
    invoice: Invoice,
    result: FactusBillResult,
  ): Promise<MailAttachment[]> {
    const attachments: MailAttachment[] = [];

    const qrContent = result.qrCode ?? invoice.factusQrCode;
    if (qrContent) {
      try {
        const png = await QRCode.toBuffer(qrContent, { width: 240, margin: 1 });
        attachments.push({
          filename: 'qr-dian.png',
          content: png,
          contentType: 'image/png',
          cid: 'qr-dian',
        });
      } catch (error) {
        this.logger.warn(
          `No se pudo generar el QR para la factura ${invoice.invoiceId}: ${
            (error as Error).message
          }`,
        );
      }
    }

    const number = result.billNumber ?? invoice.factusNumber;

    // Nota: la API de Factus v2 no expone el PDF oficial para descarga (solo el
    // 'public_url' como página web, incluido como enlace en el correo). Por eso
    // adjuntamos nuestra propia representación (PDF branded) y enlazamos el oficial.

    // PDF "branded" (la misma representación del botón Descargar de ver-facturas),
    // generado en el servidor con pdfmake. Best-effort.
    const branded = await this.invoicePdfService.generateInvoicePdf(invoice);
    if (branded) {
      attachments.push({
        filename: `factura-${number ?? invoice.code}.pdf`,
        content: branded,
        contentType: 'application/pdf',
      });
    }

    return attachments;
  }

  /** ¿Los adjuntos incluyen el QR inline? (para decidir si mostrar el <img cid>) */
  private hasInlineQr(attachments: MailAttachment[]): boolean {
    return attachments.some((a) => a.cid === 'qr-dian');
  }

  /**
   * Envía al cliente facturado nuestra propia copia de la factura electrónica
   * (número, CUFE, enlace a la factura oficial DIAN y QR). No dependemos del
   * correo de Factus (enviamos send_email=false). Best-effort: si falla NO se
   * interrumpe la emisión, que ya quedó válida ante la DIAN.
   */
  private async notifyCustomer(
    invoice: Invoice,
    result: FactusBillResult,
    attachments: MailAttachment[],
  ): Promise<void> {
    const to = invoice.user?.email?.trim();
    const isValidEmail = !!to && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to);
    if (!isValidEmail) {
      this.logger.warn(
        `Factura ${invoice.invoiceId}: el cliente no tiene email válido; no se envió copia al cliente.`,
      );
      return;
    }
    const orgName =
      invoice.organizational?.legalName ?? invoice.organizational?.name ?? '';
    const clientName =
      `${invoice.user?.firstName ?? ''} ${invoice.user?.lastName ?? ''}`.trim();
    try {
      await this.mailsService.sendEmail({
        to: to!,
        subject: `Tu factura electrónica ${result.billNumber ?? invoice.code} — ${orgName}`,
        body: this.buildInvoiceEmailHtml(invoice, result, orgName, {
          audience: 'customer',
          name: clientName,
          hasQr: this.hasInlineQr(attachments),
        }),
        attachments,
      });
      this.logger.log(
        `Copia de factura ${invoice.invoiceId} enviada al cliente (${to}).`,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo enviar la copia al cliente (factura ${invoice.invoiceId}): ${
          (error as Error).message
        }`,
      );
    }
  }

  /**
   * Plantilla de correo de la factura electrónica, reutilizada para el cliente
   * y para el negocio (cambia solo el encabezado/saludo según 'audience').
   * El QR se referencia como imagen inline (cid:qr-dian) — adjunta por
   * buildInvoiceAttachments — para que se renderice en Gmail/Outlook.
   */
  private buildInvoiceEmailHtml(
    invoice: Invoice,
    result: FactusBillResult,
    orgName: string,
    opts: { audience: 'customer' | 'business'; name: string; hasQr: boolean },
  ): string {
    const url = result.publicUrl ?? invoice.factusPublicUrl ?? '';
    const number = result.billNumber ?? invoice.code;
    const isCustomer = opts.audience === 'customer';
    const title = isCustomer
      ? 'Tu factura electrónica'
      : 'Factura electrónica emitida';
    const intro = isCustomer
      ? `Hola ${opts.name || ''}, gracias por tu compra en <strong>${orgName}</strong>. Adjuntamos tu factura electrónica en PDF.`
      : `<strong>${orgName}</strong> — copia de la factura emitida${
          opts.name ? ` a ${opts.name}` : ''
        }.`;
    const ctaText = isCustomer
      ? 'Ver / descargar tu factura oficial'
      : 'Ver la factura oficial';

    const row = (label: string, value: string) => `
            <tr>
              <td style="padding:6px 10px; color:#6b7280; font-size:13px; white-space:nowrap;">${label}</td>
              <td style="padding:6px 10px; color:#111827; font-size:14px; font-weight:600; word-break:break-all;">${value}</td>
            </tr>`;

    // Datos del cliente facturado (los que existan; en extranjeros depto/municipio
    // van vacíos y se omiten).
    const user = invoice.user;
    const clientName =
      `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    const docType = user?.identificationType?.code ?? '';
    const docNumber = user?.identificationNumber ?? '';
    const docLine = docNumber
      ? `${docType ? docType + ' ' : ''}${docNumber}`
      : '';
    const location = [user?.municipality?.name, user?.department?.name]
      .filter(Boolean)
      .join(', ');
    const address = user?.address?.trim() ?? '';
    const clientEmail = user?.email?.trim() ?? '';

    return `
      <div style="margin:0; padding:24px; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
          <div style="background:#486e2b; padding:20px 24px;">
            <h1 style="margin:0; color:#ffffff; font-size:20px;">${title}</h1>
            <p style="margin:4px 0 0; color:#dbe7cf; font-size:13px;">${orgName}</p>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 16px; color:#374151; font-size:14px; line-height:1.5;">${intro}</p>
            <table style="border-collapse:collapse; width:100%; background:#f9fafb; border:1px solid #eef0f2; border-radius:8px;">
              ${row('Número', number)}
              ${row('Referencia', invoice.code)}
              ${row('CUFE', result.cufe ?? '—')}
              ${clientName ? row('Cliente', clientName) : ''}
              ${docLine ? row('Documento', docLine) : ''}
              ${location ? row('Ubicación', location) : ''}
              ${address ? row('Dirección', address) : ''}
              ${clientEmail ? row('Correo', clientEmail) : ''}
            </table>
            ${
              url
                ? `<div style="margin:20px 0;">
                     <a href="${url}" style="display:inline-block; background:#486e2b; color:#ffffff; text-decoration:none; padding:10px 18px; border-radius:8px; font-size:14px; font-weight:600;">${ctaText}</a>
                   </div>`
                : ''
            }
            ${
              opts.hasQr
                ? `<div style="margin-top:16px; text-align:center;">
                     <img src="cid:qr-dian" alt="QR DIAN" width="150" height="150" style="border:1px solid #e5e7eb; border-radius:8px; padding:6px; background:#fff;" />
                     <p style="margin:6px 0 0; color:#9ca3af; font-size:12px;">Escanea para validar en la DIAN</p>
                   </div>`
                : ''
            }
          </div>
          <div style="padding:14px 24px; background:#f9fafb; border-top:1px solid #eef0f2;">
            <p style="margin:0; color:#9ca3af; font-size:12px;">Este es un mensaje automático, si tiene una duda por favor responda a el.</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Envía una copia de la factura electrónica al correo del negocio. La copia al
   * cliente la envía Factus automáticamente (send_email). Es best-effort: si el
   * correo falla NO se interrumpe la emisión, que ya quedó válida ante la DIAN.
   * Solo corre en la primera emisión (el camino "ya enviada" retorna antes).
   */
  private async notifyBusiness(
    invoice: Invoice,
    result: FactusBillResult,
    attachments: MailAttachment[],
  ): Promise<void> {
    // En desarrollo NO enviamos la copia al negocio (ya está verificada).
    // Solo se envía en producción.
    if (process.env.APP_ENV !== 'production') {
      this.logger.log(
        `Factura ${invoice.invoiceId}: APP_ENV=${process.env.APP_ENV ?? 'undefined'}; ` +
          `se omite la copia al negocio (solo se envía en producción).`,
      );
      return;
    }
    const to = invoice.organizational?.email?.trim();
    if (!to) {
      this.logger.warn(
        `Factura ${invoice.invoiceId}: la organización no tiene email; no se envió copia al negocio.`,
      );
      return;
    }
    const orgName =
      invoice.organizational?.legalName ?? invoice.organizational?.name ?? '';
    const clientName =
      `${invoice.user?.firstName ?? ''} ${invoice.user?.lastName ?? ''}`.trim();
    try {
      await this.mailsService.sendEmail({
        to,
        subject: `Factura electrónica ${result.billNumber ?? invoice.code} — ${orgName}`,
        body: this.buildInvoiceEmailHtml(invoice, result, orgName, {
          audience: 'business',
          name: clientName,
          hasQr: this.hasInlineQr(attachments),
        }),
        attachments,
      });
      this.logger.log(
        `Copia de factura ${invoice.invoiceId} enviada al negocio (${to}).`,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo enviar la copia al negocio (factura ${invoice.invoiceId}): ${
          (error as Error).message
        }`,
      );
    }
  }

  /**
   * Consulta de SOLO LECTURA del estado Factus de una factura interna.
   * No envía nada a la DIAN: devuelve los campos factus* ya guardados.
   */
  async getFactusStatus(invoiceId: number): Promise<{
    sent: boolean;
    billNumber: string | null;
    referenceCode: string | null;
    cufe: string | null;
    qrCode: string | null;
    publicUrl: string | null;
    sentAt: string | null;
  }> {
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceId },
    });
    if (!invoice)
      throw new NotFoundException(`Factura ${invoiceId} no encontrada`);

    return {
      sent: Boolean(invoice.factusNumber),
      billNumber: invoice.factusNumber ?? null,
      referenceCode: invoice.code ?? null,
      cufe: invoice.factusCufe ?? null,
      qrCode: invoice.factusQrCode ?? null,
      publicUrl: invoice.factusPublicUrl ?? null,
      sentAt: invoice.factusSentAt?.toISOString() ?? null,
    };
  }

  /**
   * RECUPERACIÓN: la factura fue procesada por la DIAN (Regla 90 / ya existe en
   * Factus) pero el resultado nunca se guardó en la BD local (p. ej. el servidor
   * cayó justo después de emitir, o hubo un timeout). Este método busca la
   * factura en Factus por reference_code (y variantes -v2/-v3 si las hubiera),
   * extrae el número/CUFE/QR y los persiste en la factura interna.
   *
   * Después de esto la factura queda marcada como electrónica y no se puede
   * volver a emitir (idempotencia normal).
   */
  async recoverFromFactus(invoiceId: number): Promise<FactusBillResult> {
    const invoice = await this.loadInvoice(invoiceId);

    if (invoice.factusNumber) {
      this.logger.log(
        `Factura ${invoiceId} ya tiene factusNumber ${invoice.factusNumber}; no hace falta recuperar.`,
      );
      return {
        billNumber: invoice.factusNumber,
        referenceCode: invoice.factusReferenceCode ?? invoice.code,
        isValidated: true,
        cufe: invoice.factusCufe ?? null,
        qrCode: invoice.factusQrCode ?? null,
        publicUrl: invoice.factusPublicUrl ?? null,
        createdAt:
          invoice.factusSentAt?.toISOString() ?? invoice.createdAt.toISOString(),
      };
    }

    // Un único reference_code: el de la factura. Ya no se prueban sufijos
    // -v2…-v6 porque la emisión tampoco los genera.
    const raw = await this.billsService.getBillByReference(invoice.code);

    if (!raw) {
      throw new NotFoundException(
        `No existe en Factus ninguna factura con reference_code "${invoice.code}". ` +
          `Verifícalo en el portal de Factus antes de volver a intentarlo.`,
      );
    }

    const result: FactusBillResult = {
      billNumber: raw.number ?? raw.bill_number ?? null,
      // Sin `?? true`: asumir que estaba validada era justamente lo que
      // marcaba como electrónicas facturas que la DIAN nunca aceptó, dejándolas
      // con número pero sin CUFE.
      isValidated: raw.is_validated === true,
      referenceCode: invoice.code,
      cufe: raw.cufe ?? null,
      qrCode: raw.links?.qr ?? raw.qr_code ?? null,
      publicUrl: raw.links?.public_url ?? null,
      createdAt: raw.created_at ?? new Date().toISOString(),
    };

    if (!result.isValidated) {
      const errors = this.extractErrors(raw);
      const rejected = FactusInvoiceService.looksRejected(errors);
      this.logger.warn(
        `Factura ${invoiceId}: existe en Factus como ${result.billNumber ?? 's/n'} ` +
          `pero NO está validada por la DIAN (${rejected ? 'rechazada' : 'pendiente'}). ` +
          `No se persiste nada.`,
      );
      throw new UnprocessableEntityException({
        message: rejected
          ? `La factura existe en Factus (${result.billNumber ?? 's/n'}) pero la DIAN la RECHAZÓ. No se puede dar por emitida.`
          : `La factura existe en Factus (${result.billNumber ?? 's/n'}) pero sigue PENDIENTE en la DIAN. No se puede dar por emitida todavía.`,
        pendingInDian: !rejected,
        rejected,
        billNumber: result.billNumber,
        referenceCode: invoice.code,
        errors,
        hint: rejected
          ? `Elimínala con DELETE /factus/invoices/by-reference/${invoice.code}, corrige los datos y reenvíala.`
          : 'No elimines nada. Reintenta POST :id/send más tarde con los mismos datos.',
      });
    }

    invoice.factusReferenceCode = invoice.code;
    await this.saveFactusResult(invoice, result);

    this.logger.log(
      `Factura ${invoiceId} recuperada de Factus: número=${result.billNumber}, CUFE=${result.cufe?.slice(0, 20)}…`,
    );

    // Notificaciones en segundo plano (best-effort, igual que en emisión normal)
    this.dispatchPostEmissionNotifications(invoice, result);

    return result;
  }

  /**
   * Elimina de Factus un documento NO VALIDADO por su reference_code y, si
   * corresponde a una factura nuestra, le limpia los campos Factus.
   *
   * Es la salida al bloqueo por rechazo de la DIAN: mientras el documento
   * rechazado siga en Factus, toda emisión nueva responde 409. Ver la doc de
   * Factus, "Eliminar no validada".
   *
   * Comprueba primero el estado real en Factus y se niega a borrar cualquier
   * documento validado: una factura con CUFE es inmutable y solo se anula con
   * una nota crédito.
   */
  async deleteFactusBillByReference(referenceCode: string): Promise<{
    deleted: boolean;
    referenceCode: string;
    billNumber: string | null;
    localInvoiceId: number | null;
    message: string;
  }> {
    const bill = await this.billsService.getBillByReference(referenceCode);
    if (!bill) {
      throw new NotFoundException(
        `No existe en Factus ninguna factura con reference_code "${referenceCode}".`,
      );
    }

    const billNumber: string | null = bill.number ?? bill.bill_number ?? null;
    if (bill.is_validated === true || bill.cufe) {
      throw new BadRequestException(
        `La factura ${billNumber ?? referenceCode} está VALIDADA por la DIAN ` +
          '(tiene CUFE) y no se puede eliminar. Para anularla hay que emitir una ' +
          'nota crédito.',
      );
    }

    await this.billsService.deleteBillByReference(referenceCode);

    // Si la teníamos apuntada localmente, dejamos de apuntarla: ese número ya
    // no existe en Factus y conservarlo es lo que produjo facturas con número
    // pero sin CUFE.
    const local = await this.invoiceRepository.findOne({
      where: [{ factusReferenceCode: referenceCode }, { code: referenceCode }],
    });
    if (local?.factusNumber || local?.factusReferenceCode) {
      local.factusNumber = undefined;
      local.factusCufe = undefined;
      local.factusQrCode = undefined;
      local.factusPublicUrl = undefined;
      local.factusReferenceCode = undefined;
      local.factusSentAt = undefined;
      await this.invoiceRepository.save(local);
      this.logger.warn(
        `Factura interna ${local.invoiceId}: campos Factus limpiados tras eliminar ` +
          `el documento "${referenceCode}" en Factus.`,
      );
    }

    return {
      deleted: true,
      referenceCode,
      billNumber,
      localInvoiceId: local?.invoiceId ?? null,
      message:
        `Documento "${referenceCode}"${billNumber ? ` (${billNumber})` : ''} eliminado de Factus. ` +
        'Ya se puede volver a emitir con el MISMO código.',
    };
  }

  private async loadInvoice(invoiceId: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceId },
      relations: [
        'user',
        'user.identificationType',
        'user.department',
        'user.municipality',
        'employee',
        'organizational',
        'organizational.identificationType',
        'organizational.medias',
        'organizational.medias.mediaType',
        'invoiceDetails',
        'invoiceDetails.product',
        'invoiceDetails.product.taxeType',
        'invoiceDetails.accommodation',
        'invoiceDetails.accommodation.taxeType',
        'invoiceDetails.excursion',
        'invoiceDetails.excursion.taxeType',
        'invoiceDetails.taxeType',
        'payType',
        'paidType',
        'invoiceType',
      ],
    });

    if (!invoice)
      throw new NotFoundException(`Factura ${invoiceId} no encontrada`);
    return invoice;
  }

  private validateInvoiceForFactus(invoice: Invoice): void {
    // El numbering_range_id ya no se exige aquí: se auto-resuelve contra Factus
    // (resolveNumberingRangeId), usando org.factusNumberingRangeId solo como
    // override cuando existe en el entorno.
    if (!invoice.user)
      throw new BadRequestException('La factura no tiene cliente asignado');
    if (!invoice.invoiceDetails?.length) {
      throw new BadRequestException('La factura no tiene ítems');
    }
  }

  /**
   * Construye el objeto `customer` de Factus desde el cliente de la factura.
   * Público para reutilizarlo en otros documentos (p. ej. notas crédito).
   * La organización legal se deriva del tipo de identificación: el NIT
   * (factusCode '31') es siempre persona jurídica; en este sistema un usuario es
   * o empresa (NIT) o persona (CC/CE/...), nunca ambos.
   */
  buildCustomer(invoice: Invoice): Record<string, string> {
    const org = invoice.organizational;
    const user = invoice.user;

    const docType = user.identificationType?.code?.toUpperCase() ?? '';
    const idCode =
      user.identificationType?.factusCode ??
      FACTUS_ID_CODE_BY_TYPE[docType] ??
      '13';
    const isJuridica = idCode === '31';

    // Saneamiento de la identificación. Los datos reales traen de todo: NITs con
    // guion y dígito de verificación ("18128214-6"), documentos extranjeros con
    // guion ("77-0608266"), espacios y tabuladores pegados.
    //
    // Reglas: el dv del NIT viaja aparte en `customer.dv`, nunca dentro de
    // `identification`. Los documentos colombianos van solo con dígitos; un
    // PASAPORTE (41) o una cédula de extranjería (22) conservan sus letras
    // —son alfanuméricos de verdad— y solo se les quitan separadores.
    const rawId = user.identificationNumber.trim();
    const [idBase, dvFromDash] = rawId.includes('-')
      ? rawId.split('-')
      : [rawId, undefined];
    const isNumericDoc = ['13', '31', '12', '11', '21'].includes(idCode);
    const identification = isNumericDoc
      ? idBase.replace(/\D/g, '')
      : rawId.replace(/[^A-Za-z0-9]/g, '');
    const dv = user.factusDv ?? dvFromDash?.replace(/\D/g, '');

    const customer: Record<string, string> = {
      identification_document_code: idCode,
      identification,
      address: user.address?.trim() || 'Colombia',
      legal_organization_code: isJuridica ? '1' : '2',
      tribute_code: user.factusTributeCode ?? 'ZZ',
      // Fallback al municipio del negocio (Mocoa 86001) para clientes de paso.
      municipality_code:
        user.factusMunicipalityCode ?? org?.factusMunicipalityCode ?? '86001',
    };

    // Opcionales: no se envían vacíos (Factus rechaza 422).
    const email = user.email?.trim();
    const hasValidEmail = !!email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (hasValidEmail) customer.email = email!;

    const phone = user.phone?.trim();
    if (phone) customer.phone = phone;

    if (dv) customer.dv = dv;
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    if (isJuridica) {
      customer.company = fullName; // razón social
    } else {
      customer.names = fullName;
    }
    return customer;
  }

  private buildPayload(
    invoice: Invoice,
    numberingRangeId: number,
  ): Record<string, unknown> {
    const payment = resolveFactusPayment(invoice.payType?.code);

    const customer = this.buildCustomer(invoice);

    const items = invoice.invoiceDetails
      .filter((d) => !d.deletedAt)
      .map((d) => this.mapDetail(d));

    // Recalculate total from the exact item values we send to Factus.
    // Factus recomputa el total ítem por ítem, redondeando el neto y el IVA de
    // CADA línea a 2 decimales antes de sumar. Si redondeamos una sola vez al
    // final, con varios ítems la diferencia acumulada puede superar 1 centavo y
    // Factus rechaza con 422 ("La suma de todos los detalles de pago no es igual
    // al total de la factura"). Replicamos su redondeo por línea para que
    // payment_details.amount cuadre exactamente con el total que calcula Factus.
    const factusTotal = sumFactusItemsTotal(items as any);

    const paymentDetail: Record<string, string | number> = {
      payment_form: payment.form,
      payment_method_code: payment.method,
      amount: factusTotal.toFixed(2),
    };

    return {
      reference_code: invoice.code,
      document: '01',
      numbering_range_id: numberingRangeId,
      operation_type: '10',
      observation: invoice.observations ?? '',
      // No delegamos el correo en Factus: enviamos nosotros nuestra propia copia
      // al cliente (notifyCustomer). En sandbox Factus no envía correos reales,
      // y en producción evitamos duplicar el envío.
      send_email: false,
      payment_details: [paymentDetail],
      cash_rounding_amount: '0.00',
      customer,
      items,
    };
  }

  mapDetail(
    detail: InvoiceDetaill,
    quantityOverride?: number,
  ): Record<string, unknown> {
    const item = detail.product ?? detail.accommodation ?? detail.excursion;

    const itemName = item
      ? ((item.name as Record<string, string>)['es'] ??
        (item.name as Record<string, string>)['en'] ??
        'Ítem')
      : 'Ítem';

    let codeRef = 'ITEM-' + detail.invoiceDetailId;
    if (detail.product) {
      codeRef = detail.product.code ?? 'PROD-' + detail.product.productId;
    } else if (detail.accommodation) {
      codeRef =
        detail.accommodation.code ??
        'ACCOM-' + detail.accommodation.accommodationId;
    } else if (detail.excursion) {
      codeRef = detail.excursion.code ?? 'EXC-' + detail.excursion.excursionId;
    }

    const { code: taxCode, rate: taxRate } = this.resolveTax(detail);

    return {
      code_reference: codeRef,
      name: itemName,
      quantity: parseFloat(String(quantityOverride ?? detail.amount ?? 1)).toFixed(2),
      discount_rate: '0.00',
      price: parseFloat(String(detail.priceWithoutTax)).toFixed(2),
      unit_measure_code: '94',
      standard_code: '999',
      taxes: [{ code: taxCode, rate: taxRate }],
    };
  }

  resolveTax(detail: InvoiceDetaill): { code: string; rate: string } {
    // Priority 1: taxeType loaded with factusCode
    const taxeType =
      detail.taxeType ??
      detail.product?.taxeType ??
      detail.accommodation?.taxeType ??
      detail.excursion?.taxeType;

    if (taxeType?.factusCode) {
      // Factus espera el porcentaje (ej. "19.00"), no la fracción.
      // En la BD percentage se guarda como entero (19); pero si llegara
      // como fracción (0.19) lo normalizamos igual que el resto del repo
      // (invoice.service.ts:128-130): > 1 ? percentage : percentage * 100.
      const pct = Number(taxeType.percentage);
      const rate = pct > 1 ? pct : pct * 100;
      return {
        code: taxeType.factusCode,
        rate: rate.toFixed(2),
      };
    }

    // Priority 2: derivar el porcentaje desde el monto de impuesto guardado.
    // detail.taxe es un VALOR MONETARIO (priceSale - priceWithoutTax), no una
    // tasa. Para obtener la tasa: taxe / base * 100. Ej. base 1000, taxe 190 → 19%.
    const taxe = Number(detail.taxe);
    const base = Number(detail.priceWithoutTax);
    if (taxe > 0 && base > 0) {
      const rate = (taxe / base) * 100;
      return { code: '01', rate: rate.toFixed(2) };
    }

    return { code: '01', rate: '0.00' };
  }

  /**
   * Normaliza el campo `errors` de Factus a una lista de textos.
   * Viene en dos formas según el endpoint: objeto indexado por regla
   * (`{"90": "Regla: 90, Rechazo: …"}`) al listar, y array de strings al
   * consultar por número. Hay que soportar las dos.
   */
  private extractErrors(raw: any): string[] {
    const bill = raw?.data?.bill ?? raw?.data ?? raw;
    const errors = bill?.errors;
    if (!errors) return [];
    if (Array.isArray(errors)) return errors.map((e) => String(e));
    if (typeof errors === 'object') return Object.values(errors).map(String);
    return [String(errors)];
  }

  /**
   * ¿Los `errors` de la DIAN son un RECHAZO o solo una notificación?
   * No todo lo que aparece en `errors` invalida el documento: reglas como
   * FAJ44b o RUT01 son avisos informativos y la factura es válida igual. Solo
   * cuenta como rechazo si el texto dice "Rechazo".
   */
  private static looksRejected(errors: string[]): boolean {
    return errors.some((e) => /rechazo/i.test(e));
  }

  private extractResult(raw: any): FactusBillResult {
    const bill = raw?.data?.bill ?? raw?.data ?? raw;
    return {
      billNumber: bill?.number ?? bill?.bill_number ?? null,
      referenceCode: bill?.reference_code ?? null,
      isValidated: bill?.is_validated ?? false,
      cufe: bill?.cufe ?? null,
      qrCode: bill?.links?.qr ?? bill?.qr_code ?? null,
      publicUrl: bill?.links?.public_url ?? null,
      createdAt: bill?.created_at ?? new Date().toISOString(),
    };
  }

  private async saveFactusResult(
    invoice: Invoice,
    result: FactusBillResult,
  ): Promise<void> {
    invoice.invoiceElectronic = true;
    invoice.invoiceType = {
      invoiceTypeId: await this.resolveInvoiceTypeId('FVE'),
    } as any; // FVE — Factura de Venta Electrónica
    invoice.factusNumber = result.billNumber ?? undefined;
    invoice.factusCufe = result.cufe ?? undefined;
    invoice.factusQrCode = result.qrCode ?? undefined;
    invoice.factusPublicUrl = result.publicUrl ?? undefined;
    invoice.factusSentAt = new Date();
    // factusReferenceCode puede haber sido seteado antes (p. ej. en recoverFromFactus
    // cuando el reference_code real difiere de invoice.code por sufijo -v2/-v3).
    // Si no fue tocado, lo igualamos al code para que siempre quede poblado.
    if (!invoice.factusReferenceCode) {
      invoice.factusReferenceCode = invoice.code;
    }

    await this.invoiceRepository.save(invoice);
    this.logger.log(
      `Invoice ${invoice.invoiceId} saved with Factus number ${invoice.factusNumber}`,
    );
  }

  /**
   * Limpia los campos Factus de una factura (factusNumber, CUFE, QR, publicUrl,
   * factusReferenceCode, factusSentAt) para permitir reenviarla desde cero.
   *
   * ⚠️ ÚSALO SOLO SI:
   *  a) La factura tiene un número de SANDBOX (SETP…) y nunca fue enviada a prod.
   *  b) Confirmaste en el portal de Factus que NO existe en producción.
   * Si la factura ya fue validada por la DIAN en prod, usa recoverFromFactus en
   * vez de este endpoint para recuperar el número real sin re-emitir.
   */
  async resetFactusFields(invoiceId: number): Promise<{ reset: boolean; message: string }> {
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceId },
    });
    if (!invoice) throw new NotFoundException(`Factura ${invoiceId} no encontrada`);

    const prevNumber = invoice.factusNumber;

    // `code` es una secuencia POR TIPO, con UNIQUE (code, invoiceTypeId): al
    // emitir, la factura recibe un código de la serie FVE ("00001"), y esa serie
    // arranca de cero. Devolverla a FV puede chocar con una FV que ya use ese
    // mismo código. Lo detectamos antes para no reventar con un error de
    // constraint ininteligible.
    const fvId = await this.resolveInvoiceTypeId('FV');
    const clash = await this.invoiceRepository.findOne({
      where: { code: invoice.code, invoiceType: { invoiceTypeId: fvId } },
      relations: ['invoiceType'],
      withDeleted: true,
    });
    if (clash && clash.invoiceId !== invoice.invoiceId) {
      throw new BadRequestException(
        `No se puede devolver la factura ${invoiceId} al tipo FV: ya existe una ` +
          `factura FV con el código "${invoice.code}" (id ${clash.invoiceId}). ` +
          'Los códigos son una secuencia por tipo. Habría que renumerarla a mano, ' +
          'lo que cambia el número visible del documento: decisión del negocio, ' +
          'no automática.',
      );
    }

    invoice.factusNumber = undefined;
    invoice.factusCufe = undefined;
    invoice.factusQrCode = undefined;
    invoice.factusPublicUrl = undefined;
    invoice.factusSentAt = undefined;
    invoice.factusReferenceCode = undefined;
    invoice.invoiceElectronic = false;
    // Volvemos al tipo FV para que aparezca en la lista de ventas normales
    // hasta que sea re-emitida. Resuelto por `code`, nunca por id literal.
    invoice.invoiceType = {
      invoiceTypeId: await this.resolveInvoiceTypeId('FV'),
    } as any;

    await this.invoiceRepository.save(invoice);

    this.logger.warn(
      `Factura ${invoiceId}: campos Factus limpiados (previo número: ${prevNumber ?? 'ninguno'}). ` +
        `Lista para reenviar a Factus con POST :id/send.`,
    );

    return {
      reset: true,
      message:
        `Factura ${invoiceId} reseteada. Número anterior: ${prevNumber ?? 'ninguno'}. ` +
        `Ahora puedes reenviarla con POST /factus/invoices/${invoiceId}/send. ` +
        `IMPORTANTE: si la DIAN ya la tiene con el reference_code "${invoice.code}", ` +
        `Factus rechazará con Regla 90. En ese caso usa primero POST :id/recover.`,
    };
  }
}
