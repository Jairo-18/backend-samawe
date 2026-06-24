import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FactusClient } from '../factus.client';
import { FactusApiError } from '../errors/factus-api.error';
import {
  CreateBillOptions,
  FactusNumberingRange,
} from '../interfaces/bill.interfaces';

@Injectable()
export class FactusBillsService {
  private readonly logger = new Logger(FactusBillsService.name);

  constructor(
    private readonly factusClient: FactusClient,
    private readonly configService: ConfigService,
  ) {}

  buildBillPayload(options: CreateBillOptions): Record<string, unknown> {
    const year = new Date().getFullYear();
    const referenceCode = options.referenceCode ?? `FACT-${year}-${Date.now()}`;
    // OJO: numbering_range_id NO es el código de la factura. Es el ID del rango
    // de numeración autorizado por la DIAN (resolución de facturación) en Factus.
    // El código de la factura va en reference_code (arriba). Validamos que sea un
    // número válido para no enviar NaN si falta la env FACTUS_NUMBERING_RANGE_ID.
    const numberingRangeId =
      options.numberingRangeId ??
      Number(this.configService.get<string>('FACTUS_NUMBERING_RANGE_ID'));
    if (!Number.isFinite(numberingRangeId) || numberingRangeId <= 0) {
      throw new BadRequestException(
        'numbering_range_id inválido. Defina la variable de entorno ' +
          'FACTUS_NUMBERING_RANGE_ID (ID del rango de numeración DIAN en Factus) ' +
          'o envíela en numberingRangeId.',
      );
    }

    const totalFromItems = options.items.reduce((sum, item) => {
      const qty = parseFloat(String(item.quantity));
      const price = parseFloat(String(item.price));
      const discount = parseFloat(String(item.discountRate ?? '0'));
      const taxRate = parseFloat(String(item.taxRate));
      return sum + qty * price * (1 - discount / 100) * (1 + taxRate / 100);
    }, 0);

    const amount = options.paymentAmount
      ? String(Math.round(parseFloat(String(options.paymentAmount))))
      : String(Math.round(totalFromItems));

    const paymentDetail: Record<string, string | number> = {
      payment_form: options.paymentForm,
      payment_method_code: options.paymentMethodCode,
      amount,
    };
    if (options.paymentReferenceCode)
      paymentDetail.reference_code = options.paymentReferenceCode;
    if (options.dueDate) paymentDetail.due_date = options.dueDate;

    const customer: Record<string, string> = {
      identification_document_code: options.customer.identificationType,
      identification: options.customer.identification,
      address: options.customer.address,
      email: options.customer.email,
      phone: options.customer.phone,
      legal_organization_code: options.customer.legalOrganization ?? '1',
      tribute_code: options.customer.tributeCode ?? 'ZZ',
      municipality_code: options.customer.municipalityCode,
    };
    if (options.customer.dv) customer.dv = options.customer.dv;
    if (options.customer.company) customer.company = options.customer.company;
    if (options.customer.tradeName)
      customer.trade_name = options.customer.tradeName;
    if (options.customer.names) customer.names = options.customer.names;

    return {
      reference_code: referenceCode,
      document: '01',
      numbering_range_id: numberingRangeId,
      operation_type: '10',
      observation: options.observation ?? '',
      payment_details: [paymentDetail],
      cash_rounding_amount: '0.00',
      customer,
      items: options.items.map((item) => ({
        code_reference: item.codeReference,
        name: item.name,
        quantity: parseFloat(String(item.quantity)).toFixed(2),
        discount_rate: parseFloat(String(item.discountRate ?? '0')).toFixed(2),
        price: parseFloat(String(item.price)).toFixed(2),
        unit_measure_code: item.unitMeasureCode ?? '94',
        standard_code: item.standardCode ?? '999',
        taxes: [
          {
            code: item.taxCode,
            rate: parseFloat(String(item.taxRate)).toFixed(2),
          },
        ],
      })),
    };
  }

  async createAndValidateBill(
    billData: Record<string, unknown>,
  ): Promise<unknown> {
    this.validateLocally(billData);
    try {
      const response = await this.factusClient.post<unknown>(
        '/v2/bills/validate',
        billData,
      );
      this.logger.log(`Bill created successfully: ${billData.reference_code}`);
      return response;
    } catch (error) {
      if (error instanceof FactusApiError) {
        if (error.statusCode === 409) {
          throw new ConflictException(
            'Hay una factura pendiente por enviar a la DIAN con este reference_code. ' +
              'Elimínala desde el portal de Factus antes de crear una nueva.',
          );
        }
        if (error.statusCode === 422) {
          const errs = (error.responseData as any)?.errors ?? {};
          const messages = Object.entries(errs).flatMap(([field, msgs]) =>
            (msgs as string[]).map((m) => `${field}: ${m}`),
          );
          throw new UnprocessableEntityException({
            message: 'Error de validación en Factus',
            errors: messages,
          });
        }
      }
      throw error;
    }
  }

  async getBillByReference(referenceCode: string): Promise<unknown> {
    return this.factusClient.get<unknown>(
      `/v2/bills?reference_code=${encodeURIComponent(referenceCode)}`,
    );
  }

  // Cache en memoria de los rangos de "Factura de Venta" activos de la cuenta.
  private salesRangesCache: FactusNumberingRange[] | null = null;

  /**
   * Rangos de numeración de "Factura de Venta" activos y vigentes de la cuenta
   * (GET /v2/numbering-ranges). Cacheado: los rangos casi no cambian.
   */
  private async fetchActiveSalesRanges(): Promise<FactusNumberingRange[]> {
    if (this.salesRangesCache) return this.salesRangesCache;
    const res = await this.factusClient.get<any>('/v2/numbering-ranges');
    const all: FactusNumberingRange[] = res?.data?.data ?? res?.data ?? [];
    this.salesRangesCache = all.filter(
      (r) =>
        /factura de venta/i.test(String(r.document ?? '')) &&
        (r.is_active === 1 || r.is_active === true) &&
        !(r.is_expired === 1 || r.is_expired === true),
    );
    // Log de una sola vez (cacheado) — útil para verificar el entorno en prod.
    this.logger.log(
      `Rangos "Factura de Venta" activos en Factus: ${
        this.salesRangesCache
          .map((r) => `id=${r.id}(${r.prefix})`)
          .join(', ') || 'NINGUNO'
      }`,
    );
    return this.salesRangesCache;
  }

  /**
   * Resuelve el numbering_range_id a usar para emitir una factura de venta:
   *  - Si `preferredId` (org.factusNumberingRangeId) existe entre los rangos de
   *    venta de ESTE entorno, se respeta (override manual / multi-sucursal).
   *  - Si no existe (típico: 2621 de sandbox en una cuenta de producción) o no
   *    se configuró, se auto-resuelve el rango de "Factura de Venta" activo.
   * Así funciona igual en sandbox y producción sin hardcodear el id.
   */
  async resolveNumberingRangeId(preferredId?: number | null): Promise<number> {
    const ranges = await this.fetchActiveSalesRanges();
    if (ranges.length === 0) {
      throw new BadRequestException(
        'Factus no tiene un rango de numeración de "Factura de Venta" activo. ' +
          'Cree/active el rango en Factus antes de facturar electrónicamente.',
      );
    }
    if (preferredId && ranges.some((r) => r.id === preferredId)) {
      return preferredId;
    }
    if (preferredId) {
      this.logger.warn(
        `factusNumberingRangeId=${preferredId} no existe en este entorno Factus; ` +
          `usando el rango auto-resuelto id=${ranges[0].id} (${ranges[0].prefix}).`,
      );
    }
    if (ranges.length > 1) {
      this.logger.warn(
        `Hay ${ranges.length} rangos de "Factura de Venta" activos (sucursales); ` +
          `usando id=${ranges[0].id}. Configure org.factusNumberingRangeId para fijar uno.`,
      );
    }
    return ranges[0].id;
  }

  private validateLocally(data: Record<string, unknown>): void {
    if (!String(data.reference_code ?? '').trim()) {
      throw new BadRequestException('reference_code es requerido');
    }

    const customer = data.customer as Record<string, string> | undefined;
    if (customer && !/^\d+$/.test(customer.identification ?? '')) {
      throw new BadRequestException(
        'customer.identification debe contener solo números',
      );
    }

    const items = data.items as any[] | undefined;
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items no puede estar vacío');
    }
    for (const item of items) {
      if (parseFloat(item.price) <= 0) {
        throw new BadRequestException(
          `Item "${item.name}": price debe ser mayor a 0`,
        );
      }
      if (parseFloat(item.quantity) <= 0) {
        throw new BadRequestException(
          `Item "${item.name}": quantity debe ser mayor a 0`,
        );
      }
    }

    const detail = (data.payment_details as any[])?.[0];
    if (detail?.payment_form === '2' && !detail.due_date) {
      throw new BadRequestException(
        'due_date es obligatorio cuando payment_form es "2" (crédito)',
      );
    }

    if (detail) {
      const itemsTotal = items.reduce((sum: number, item: any) => {
        const qty = parseFloat(item.quantity);
        const price = parseFloat(item.price);
        const discount = parseFloat(item.discount_rate ?? '0');
        const taxRate = parseFloat(item.taxes?.[0]?.rate ?? '0');
        return sum + qty * price * (1 - discount / 100) * (1 + taxRate / 100);
      }, 0);
      const payAmt = parseFloat(String(detail.amount ?? '0'));
      if (payAmt < itemsTotal - 1) {
        throw new BadRequestException(
          `payment_details.amount (${payAmt}) no puede ser menor que el total de ítems (${itemsTotal.toFixed(2)})`,
        );
      }
    }
  }
}
