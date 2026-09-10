import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InvoiceRepository } from '../../shared/repositories/invoice.repository';
import { InvoiceTypeRepository } from '../../shared/repositories/invoiceType.repository';
import { Invoice } from '../../shared/entities/invoice.entity';
import { FactusClient } from '../factus.client';
import { FactusApiError } from '../errors/factus-api.error';
import { FactusBillsService } from './factus-bills.service';
import { FactusInvoiceService } from './factus-invoice.service';
import { isPurchaseTypeCode } from '../../shared/constants/invoiceType.constants';
import {
  FactusSupportDocumentResult,
  FactusSupportDocumentStatus,
  SUPPORT_DOCUMENT_ID_CODES,
} from '../interfaces/support-document.interfaces';

// Mismo mapa de medios de pago que facturas y notas crédito.
const PAYMENT_METHOD_MAP: Record<string, { form: string; method: string }> = {
  EFE: { form: '1', method: '10' },
  TRAS: { form: '1', method: '42' },
  CRE: { form: '2', method: '1' },
  EFECT: { form: '1', method: '10' },
  NA: { form: '1', method: '42' },
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** IVA. El documento soporte solo admite este código de impuesto. */
const TAX_CODE_IVA = '01';

@Injectable()
export class FactusSupportDocumentService {
  private readonly logger = new Logger(FactusSupportDocumentService.name);

  // Serializa la emisión por factura dentro de la instancia, igual que en las
  // notas crédito: cierra el doble-submit concurrente. En memoria → válido con
  // una sola instancia; si se escala, mover a un lock distribuido (Redis).
  private readonly invoiceLocks = new Map<number, Promise<void>>();

  private readonly invoiceTypeIdByCode = new Map<string, number>();

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly invoiceTypeRepository: InvoiceTypeRepository,
    private readonly factusClient: FactusClient,
    private readonly billsService: FactusBillsService,
    private readonly invoiceService: FactusInvoiceService,
  ) {}

  /**
   * Emite el documento soporte de una factura de COMPRA y la reclasifica a DSE.
   *
   * El flujo es el de la factura de venta, con tres diferencias que impone la
   * DIAN: la contraparte es un `provider`, el impuesto solo puede ser IVA, y el
   * proveedor no puede identificarse con cédula de ciudadanía.
   */
  async emitForInvoice(
    invoiceId: number,
  ): Promise<FactusSupportDocumentResult> {
    return this.withInvoiceLock(invoiceId, () => this.doEmit(invoiceId));
  }

  private async doEmit(
    invoiceId: number,
  ): Promise<FactusSupportDocumentResult> {
    const invoice = await this.loadInvoice(invoiceId);

    // Idempotencia: ya emitido → se devuelve lo guardado, no se reenvía nada.
    if (invoice.factusNumber) {
      this.logger.log(
        `La compra ${invoiceId} ya tiene documento soporte ${invoice.factusNumber}.`,
      );
      return {
        number: invoice.factusNumber,
        referenceCode: invoice.factusReferenceCode ?? invoice.code,
        isValidated: true,
        cuds: invoice.factusCufe ?? null,
        qrCode: invoice.factusQrCode ?? null,
        publicUrl: invoice.factusPublicUrl ?? null,
        total: Number(invoice.total).toFixed(2),
        createdAt:
          invoice.factusSentAt?.toISOString() ?? invoice.createdAt.toISOString(),
      };
    }

    this.validateInvoice(invoice);

    const provider = this.buildProvider(invoice);
    const items = this.buildItems(invoice);

    // Total exacto con el redondeo por línea de Factus (neto y luego IVA, cada
    // uno a 2 decimales), para que payment_details cuadre y no rechace con 422.
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

    const numberingRangeId = await this.billsService.resolveNumberingRangeId(
      'supportDocument',
      invoice.organizational?.factusNumberingRangeIdSupport,
    );

    // Referencia DETERMINISTA, sin timestamp: Factus deduplica por
    // reference_code y reenviar el mismo *es* el reintento oficial. Un código
    // nuevo en cada intento crea documentos sueltos y multiplica los pendientes
    // — el error que dejó la facturación de producción caída con A773.
    const referenceCode = `DS-${invoice.code}`;

    const payload: Record<string, unknown> = {
      reference_code: referenceCode,
      numbering_range_id: numberingRangeId,
      observation: (invoice.observations ?? '').slice(0, 250),
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

    // Solo se da por emitido si la DIAN lo validó. Sin esto quedaría una compra
    // reclasificada a DSE con número pero sin CUDS, que es exactamente el
    // estado inconsistente que hubo que limpiar a mano en producción.
    if (result.isValidated !== true) {
      const errors = this.extractErrors(raw);
      const rejected = errors.some((e) => /rechazo/i.test(e));
      this.logger.error(
        `Documento soporte ${referenceCode} (compra ${invoiceId}): ` +
          `is_validated=false (${rejected ? 'RECHAZO' : 'pendiente en la DIAN'}). ` +
          `No se persiste nada. errors=${JSON.stringify(errors)}`,
      );
      throw new UnprocessableEntityException({
        message: rejected
          ? 'La DIAN rechazó el documento soporte. No quedó emitido.'
          : 'La DIAN aún no ha validado el documento soporte. No quedó emitido todavía.',
        pendingInDian: !rejected,
        rejected,
        referenceCode,
        number: result.number,
        errors,
        hint: rejected
          ? `Elimínalo con DELETE /factus/support-documents/by-reference/${referenceCode}, corrige y reenvía.`
          : 'No elimines nada. Reintenta más tarde con los MISMOS datos.',
      });
    }

    await this.persist(invoice, result, referenceCode);
    return result;
  }

  /** Estado de solo lectura, sin llamar a Factus. */
  async getStatus(invoiceId: number): Promise<FactusSupportDocumentStatus> {
    const invoice = await this.invoiceRepository.findOne({
      where: { invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException(`Factura ${invoiceId} no encontrada`);
    }
    return {
      issued: Boolean(invoice.factusNumber),
      number: invoice.factusNumber ?? null,
      referenceCode: invoice.factusReferenceCode ?? null,
      cuds: invoice.factusCufe ?? null,
      qrCode: invoice.factusQrCode ?? null,
      publicUrl: invoice.factusPublicUrl ?? null,
      sentAt: invoice.factusSentAt?.toISOString() ?? null,
    };
  }

  /**
   * Elimina en Factus un documento soporte NO VALIDADO por su referencia.
   * Es el procedimiento oficial ante un rechazo de la DIAN: mientras el
   * documento rechazado siga ahí, Factus responde 409 a cualquier emisión nueva.
   */
  async deleteByReference(referenceCode: string): Promise<unknown> {
    try {
      // OJO: la ruta NO lleva `/destroy/` como la de facturas
      // (`/v2/bills/destroy/reference/…`). Aquí es directo sobre `/reference/`.
      const res = await this.factusClient.delete<unknown>(
        `/v2/support-documents/reference/${encodeURIComponent(referenceCode)}`,
      );
      this.logger.warn(
        `Documento soporte con reference_code "${referenceCode}" eliminado en Factus.`,
      );
      return res;
    } catch (error) {
      if (error instanceof FactusApiError) {
        const detail =
          (error.responseData as any)?.message ?? `HTTP ${error.statusCode}`;
        throw new BadRequestException(
          `No se pudo eliminar en Factus el documento soporte "${referenceCode}": ` +
            `${detail}. Solo se pueden eliminar documentos NO validados por la DIAN.`,
        );
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------- internos

  private validateInvoice(invoice: Invoice): void {
    if (!isPurchaseTypeCode(invoice.invoiceType?.code)) {
      throw new BadRequestException(
        'El documento soporte solo se emite sobre facturas de COMPRA (FC). ' +
          `Esta factura es de tipo "${invoice.invoiceType?.code ?? 'desconocido'}".`,
      );
    }
    if (!invoice.user) {
      throw new BadRequestException('La compra no tiene proveedor asignado.');
    }
    if (!invoice.invoiceDetails?.some((d) => !d.deletedAt)) {
      throw new BadRequestException('La compra no tiene ítems.');
    }
  }

  /**
   * Contraparte del documento soporte. Se apoya en `buildCustomer` del servicio
   * de facturas para no duplicar el saneamiento de identificaciones (NITs con
   * guion, documentos extranjeros con letras, dv que viaja aparte) y traduce el
   * resultado al vocabulario del `provider`.
   */
  private buildProvider(invoice: Invoice): Record<string, string> {
    const customer = this.invoiceService.buildCustomer(invoice);
    const idCode = customer.identification_document_code;

    // La cédula de ciudadanía NO es válida aquí: la DIAN exige que el proveedor
    // de un documento soporte se identifique con NIT (o documento extranjero).
    // Se corta antes de llamar a Factus para dar un error accionable en vez de
    // un 422 opaco.
    if (!(SUPPORT_DOCUMENT_ID_CODES as readonly string[]).includes(idCode)) {
      throw new BadRequestException(
        `El proveedor "${customer.names ?? customer.company ?? ''}" está registrado con un ` +
          `tipo de documento que la DIAN no acepta en un documento soporte ` +
          `(código ${idCode}). Debe identificarse con NIT — una persona natural no ` +
          'obligada a facturar también tiene NIT, normalmente su misma cédula ' +
          'registrada en el RUT. Corrige el tipo de documento del proveedor y reintenta.',
      );
    }

    const provider: Record<string, string> = {
      identification_document_code: idCode,
      identification: customer.identification,
      address: customer.address,
      country_code: 'CO',
      municipality_code: customer.municipality_code,
      legal_organization_code: customer.legal_organization_code,
      // `names` es obligatorio en el provider incluso para personas jurídicas,
      // donde buildCustomer deja la razón social en `company`.
      names: customer.names ?? customer.company ?? 'Proveedor',
    };
    if (customer.company) provider.trade_name = customer.company;
    if (customer.dv) provider.dv = customer.dv;
    if (customer.email) provider.email = customer.email;
    if (customer.phone) provider.phone = customer.phone;
    return provider;
  }

  /**
   * Ítems del documento soporte. Reusa `mapDetail` y luego normaliza el
   * impuesto: la DIAN solo admite IVA (código 01) aquí, así que un ICO o un
   * impuesto ausente se envía como excluido. Un proveedor no obligado a
   * facturar no cobra IVA, de modo que el caso normal es tasa 0 / excluido.
   */
  private buildItems(invoice: Invoice): Record<string, unknown>[] {
    return invoice.invoiceDetails
      .filter((d) => !d.deletedAt)
      .map((detail) => {
        const item = this.invoiceService.mapDetail(detail);
        const [tax] = item.taxes as { code: string; rate: string }[];
        const isIva = tax?.code === TAX_CODE_IVA;
        const rate = parseFloat(tax?.rate ?? '0');

        if (!isIva && rate > 0) {
          this.logger.warn(
            `Compra ${invoice.invoiceId}, ítem "${String(item.name)}": el impuesto ` +
              `${tax.code} al ${tax.rate}% no aplica en un documento soporte ` +
              '(solo IVA). Se envía como excluido y el total baja en consecuencia.',
          );
        }

        item.taxes = isIva
          ? [{ code: TAX_CODE_IVA, rate: rate.toFixed(2) }]
          : [{ code: TAX_CODE_IVA, rate: '0.00', is_excluded: true }];
        return item;
      });
  }

  private async createAndValidate(
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const response = await this.factusClient.post<unknown>(
        '/v2/support-documents/validate',
        payload,
      );
      this.logger.log(
        `Documento soporte creado: ${String(payload.reference_code)}`,
      );
      return response;
    } catch (error) {
      if (error instanceof FactusApiError) {
        if (error.statusCode === 409) {
          const ref = String(payload.reference_code);
          throw new ConflictException(
            'Factus tiene un documento soporte pendiente por enviar a la DIAN con ' +
              `el reference_code "${ref}". Mientras siga ahí bloquea los envíos. ` +
              `Elimínalo con DELETE /factus/support-documents/by-reference/${ref} y ` +
              'reintenta con el MISMO reference_code: Factus deduplica por él, y ' +
              'cambiarlo crea un documento nuevo en vez de reintentar.',
          );
        }
        if (error.statusCode === 422) {
          const errs = (error.responseData as any)?.errors ?? {};
          const messages = Object.entries(errs).flatMap(([field, msgs]) =>
            (msgs as string[]).map((m) => `${field}: ${m}`),
          );
          throw new UnprocessableEntityException({
            message: 'Error de validación en Factus (documento soporte)',
            errors: messages.length
              ? messages
              : [String((error.responseData as any)?.message ?? '')],
          });
        }
      }
      throw error;
    }
  }

  private extractErrors(raw: any): string[] {
    const doc = raw?.data?.support_document ?? raw?.data ?? raw;
    const errors = doc?.errors;
    if (!errors) return [];
    if (Array.isArray(errors)) return errors.map((e) => String(e));
    if (typeof errors === 'object') return Object.values(errors).map(String);
    return [String(errors)];
  }

  private extractResult(
    raw: any,
    referenceCode: string,
    total: number,
  ): FactusSupportDocumentResult {
    const doc = raw?.data?.support_document ?? raw?.data ?? raw;
    return {
      number: doc?.number ?? null,
      referenceCode: doc?.reference_code ?? referenceCode,
      isValidated: doc?.is_validated ?? false,
      cuds: doc?.cuds ?? doc?.cude ?? doc?.cufe ?? null,
      qrCode: doc?.links?.qr ?? doc?.qr_code ?? null,
      publicUrl: doc?.links?.public_url ?? null,
      total: total.toFixed(2),
      createdAt: doc?.created_at ?? new Date().toISOString(),
    };
  }

  /**
   * Reclasifica la compra a DSE y guarda el resultado. Se reusan las columnas
   * `factus*` de Invoice: `factusCufe` guarda el CUDS, que cumple el mismo papel.
   */
  private async persist(
    invoice: Invoice,
    result: FactusSupportDocumentResult,
    referenceCode: string,
  ): Promise<void> {
    invoice.invoiceElectronic = true;
    invoice.invoiceType = {
      invoiceTypeId: await this.resolveInvoiceTypeId('DSE'),
    } as any;
    invoice.factusNumber = result.number ?? undefined;
    invoice.factusCufe = result.cuds ?? undefined;
    invoice.factusQrCode = result.qrCode ?? undefined;
    invoice.factusPublicUrl = result.publicUrl ?? undefined;
    invoice.factusReferenceCode = referenceCode;
    invoice.factusSentAt = new Date();

    await this.invoiceRepository.save(invoice);
    this.logger.log(
      `Compra ${invoice.invoiceId} emitida como documento soporte ${result.number}.`,
    );
  }

  /**
   * Id de un InvoiceType por `code`. Nunca por literal: los ids los asigna un
   * SERIAL al sembrar el catálogo y difieren entre bases (en producción el 3 es
   * CO, no FV, y ese supuesto ya convirtió facturas en cotizaciones).
   */
  private async resolveInvoiceTypeId(code: string): Promise<number> {
    const cached = this.invoiceTypeIdByCode.get(code);
    if (cached) return cached;

    const type = await this.invoiceTypeRepository.findOne({ where: { code } });
    if (!type) {
      throw new BadRequestException(
        `No existe un InvoiceType con code "${code}". Corre la migración ` +
          '1780100000000-AddSupportDocumentType antes de emitir documentos soporte.',
      );
    }
    this.invoiceTypeIdByCode.set(code, type.invoiceTypeId);
    return type.invoiceTypeId;
  }

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
        'invoiceDetails.product.taxeType',
        'invoiceDetails.accommodation',
        'invoiceDetails.accommodation.taxeType',
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
