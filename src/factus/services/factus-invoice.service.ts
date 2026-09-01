import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceRepository } from '../../shared/repositories/invoice.repository';
import { Invoice } from '../../shared/entities/invoice.entity';
import { InvoiceDetaill } from '../../shared/entities/invoiceDetaill.entity';
import { FactusBillsService } from './factus-bills.service';
import { FactusBillResult } from '../interfaces/bill.interfaces';
import { MailsService } from '../../shared/services/mails.service';
import { InvoicePdfService } from '../../shared/services/invoicePdf.service';
import { MailAttachment } from '../../shared/interfaces/mail.interface';
import * as QRCode from 'qrcode';

// Factus payment_method_code by internal PayType.code
const PAYMENT_METHOD_MAP: Record<string, { form: string; method: string }> = {
  EFE: { form: '1', method: '10' }, // Efectivo
  TRAS: { form: '1', method: '42' }, // Transferencia/Consignación
  CRE: { form: '2', method: '1' }, // Crédito
  EFECT: { form: '1', method: '10' }, // Efectivo y Transferencia
  NA: { form: '1', method: '42' }, // No aplica → default contado
};

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

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly billsService: FactusBillsService,
    private readonly mailsService: MailsService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

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
      invoice.organizational?.factusNumberingRangeId,
    );
    const payload = this.buildPayload(invoice, numberingRangeId);

    let raw: any;
    let attempt = 0;
    const maxAttempts = 6;
    let currentReferenceCode = invoice.code;

    while (attempt < maxAttempts) {
      try {
        raw = await this.billsService.createAndValidateBill(payload);
        break; // Éxito
      } catch (error: any) {
        const isConflict = error?.status === 409 || error?.response?.statusCode === 409;
        const isRule90 =
          (error?.status === 422 || error?.response?.statusCode === 422) &&
          JSON.stringify(error?.response ?? {}).includes('procesado anteriormente');

        if (isConflict || isRule90) {
          attempt++;
          if (attempt >= maxAttempts) throw error;
          
          currentReferenceCode = `${invoice.code}-v${attempt + 1}`;
          payload.reference_code = currentReferenceCode;
          
          this.logger.warn(
            `Factura ${invoiceId}: reference_code anterior rechazado (409/Regla 90). ` +
            `Reintentando con sufijo: ${currentReferenceCode}`,
          );
        } else {
          throw error;
        }
      }
    }

    const result = this.extractResult(raw);
    invoice.factusReferenceCode = currentReferenceCode;
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

    // Probamos el code base y hasta 5 sufijos (-v2 … -v6) por si algún reintento
    // anterior usó sufijo. Nos detenemos en el primero que Factus devuelva.
    const candidates = [
      invoice.code,
      ...([2, 3, 4, 5, 6].map((n) => `${invoice.code}-v${n}`)),
    ];

    let raw: any = null;
    let matchedRef: string = invoice.code;

    for (const ref of candidates) {
      try {
        const res = await this.billsService.getBillByReference(ref);
        const bills = (res as any)?.data?.data ?? (res as any)?.data ?? [];
        const found = Array.isArray(bills) ? bills[0] : bills;
        if (found?.number || found?.bill_number) {
          raw = found;
          matchedRef = ref;
          this.logger.log(
            `Factura ${invoiceId}: encontrada en Factus con reference_code="${ref}" → número ${found.number ?? found.bill_number}`,
          );
          break;
        }
      } catch {
        // Si Factus devuelve 404 para este ref, seguimos con el siguiente.
      }
    }

    if (!raw) {
      throw new NotFoundException(
        `No se encontró la factura ${invoiceId} en Factus con ninguno de los ` +
          `reference_codes probados (${candidates.join(', ')}). ` +
          `Verifica en el portal de Factus el reference_code correcto.`,
      );
    }

    // Armamos el resultado en el mismo formato que extractResult usa
    const result: FactusBillResult = {
      billNumber: raw.number ?? raw.bill_number ?? null,
      referenceCode: matchedRef,
      isValidated: raw.is_validated ?? true,
      cufe: raw.cufe ?? null,
      qrCode: raw.links?.qr ?? raw.qr_code ?? null,
      publicUrl: raw.links?.public_url ?? null,
      createdAt: raw.created_at ?? new Date().toISOString(),
    };

    // Guardar el factusReferenceCode real (puede tener sufijo) además del resultado
    invoice.factusReferenceCode = matchedRef;
    await this.saveFactusResult(invoice, result);

    this.logger.log(
      `Factura ${invoiceId} recuperada de Factus: número=${result.billNumber}, CUFE=${result.cufe?.slice(0, 20)}…`,
    );

    // Notificaciones en segundo plano (best-effort, igual que en emisión normal)
    this.dispatchPostEmissionNotifications(invoice, result);

    return result;
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

    // La identificación debe ir SOLO con dígitos; el dv del NIT va aparte en
    // customer.dv. Datos legacy pueden traer el NIT con guion+dv; lo saneamos.
    const rawId = user.identificationNumber.trim();
    const [idBase, dvFromDash] = rawId.includes('-')
      ? rawId.split('-')
      : [rawId, undefined];
    const identification = isJuridica ? idBase.replace(/\D/g, '') : rawId;
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
    const payTypeCode = invoice.payType?.code ?? 'TRAS';
    const payment =
      PAYMENT_METHOD_MAP[payTypeCode] ?? PAYMENT_METHOD_MAP['TRAS'];

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
    const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const factusTotal = items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity as string);
      const price = parseFloat(item.price as string);
      const discount = parseFloat(item.discount_rate as string);
      const taxRate = parseFloat((item.taxes as any[])[0].rate as string);
      const net = round2(qty * price * (1 - discount / 100));
      const tax = round2((net * taxRate) / 100);
      return sum + net + tax;
    }, 0);

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
    invoice.invoiceType = { invoiceTypeId: 4 } as any; // FVE — Factura de Venta Electrónica
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

    invoice.factusNumber = undefined;
    invoice.factusCufe = undefined;
    invoice.factusQrCode = undefined;
    invoice.factusPublicUrl = undefined;
    invoice.factusSentAt = undefined;
    invoice.factusReferenceCode = undefined;
    invoice.invoiceElectronic = false;
    // Volvemos al tipo FV (id=3) para que aparezca en la lista de ventas normales
    // hasta que sea re-emitida. El id 3 es FV en prod (confirmado por el dueño).
    invoice.invoiceType = { invoiceTypeId: 3 } as any;

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
