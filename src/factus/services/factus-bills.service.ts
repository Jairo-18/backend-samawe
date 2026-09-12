import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FactusClient } from '../factus.client';
import { FactusApiError } from '../errors/factus-api.error';
import {
  CreateBillOptions,
  FactusDocumentKind,
  FactusNumberingRange,
  FactusNumberingRangeOverview,
  RANGE_DOCUMENT_CODE,
} from '../interfaces/bill.interfaces';

@Injectable()
export class FactusBillsService {
  private readonly logger = new Logger(FactusBillsService.name);

  constructor(private readonly factusClient: FactusClient) {}

  buildBillPayload(options: CreateBillOptions): Record<string, unknown> {
    const year = new Date().getFullYear();
    const referenceCode = options.referenceCode ?? `FACT-${year}-${Date.now()}`;
    // OJO: numbering_range_id NO es el código de la factura. Es el ID del rango
    // de numeración autorizado por la DIAN (resolución de facturación) en Factus.
    // El código de la factura va en reference_code (arriba).
    //
    // Quien emite de verdad (factus-invoice.service y las notas) resuelve el id
    // antes con `resolveNumberingRangeId`, que mira los rangos REALES de la
    // cuenta y descarta los vencidos. Aquí solo se valida, y se falla fuerte si
    // no vino: hubo una env `FACTUS_NUMBERING_RANGE_ID` de respaldo con un id
    // que ya no existía en la cuenta, y un respaldo que miente es peor que no
    // tener respaldo — emitiría con un rango ajeno o reventaría en Factus.
    const numberingRangeId = options.numberingRangeId;
    if (
      numberingRangeId == null ||
      !Number.isFinite(Number(numberingRangeId)) ||
      Number(numberingRangeId) <= 0
    ) {
      throw new BadRequestException(
        'Falta numbering_range_id. El rango se elige por documento en la vista ' +
          'Numeración DIAN y lo resuelve resolveNumberingRangeId; si se llama a ' +
          'este endpoint a mano, hay que enviar numberingRangeId en el cuerpo.',
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
            'Factus tiene una factura pendiente por enviar a la DIAN con el ' +
              `reference_code "${String(billData.reference_code)}". Mientras siga ahí, ` +
              'ninguna factura nueva se puede emitir. Elimínala con ' +
              `DELETE /factus/invoices/by-reference/${String(billData.reference_code)} ` +
              '(o desde el portal de Factus) y vuelve a intentarlo con el MISMO ' +
              'reference_code. NO uses un código distinto: Factus deduplica por ' +
              'reference_code, y cambiarlo crea un documento nuevo en vez de reintentar.',
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

  /**
   * Busca en Factus la factura con ESTE reference_code exacto.
   *
   * ⚠️ El parámetro correcto es `filter[reference_code]`, NO `reference_code`.
   * Con el nombre suelto Factus ignora el filtro y devuelve la primera página de
   * TODAS las facturas de la cuenta — quien tomara `data[0]` se llevaba una
   * factura ajena. Eso fue exactamente lo que hizo que dos facturas distintas
   * "recuperaran" el mismo número A773 en producción.
   *
   * Por eso, además del filtro, comparamos el reference_code devuelto: si Factus
   * cambiara el contrato y volviera a ignorarlo, preferimos no encontrar nada
   * antes que devolver la factura equivocada.
   */
  async getBillByReference(referenceCode: string): Promise<any | null> {
    const res = await this.factusClient.get<any>('/v2/bills', {
      params: { 'filter[reference_code]': referenceCode },
    });

    const list: any[] = res?.data?.data ?? res?.data ?? [];
    const bills = Array.isArray(list) ? list : [list];
    const match = bills.find(
      (b) => String(b?.reference_code ?? '') === String(referenceCode),
    );

    if (!match && bills.length) {
      this.logger.warn(
        `Factus devolvió ${bills.length} factura(s) para filter[reference_code]=` +
          `"${referenceCode}" pero ninguna coincide exactamente; se descartan.`,
      );
    }
    return match ?? null;
  }

  /**
   * Elimina de Factus una factura NO VALIDADA, por su reference_code.
   *
   * Es el procedimiento oficial ante un rechazo de la DIAN: mientras el
   * documento rechazado siga en Factus, el API responde 409 a cualquier emisión
   * nueva ("Se encontró una factura pendiente por enviar a la DIAN") y bloquea
   * la facturación. Ver `Eliminar no validada` en la doc de Factus v2.
   *
   * ⚠️ Solo funciona con facturas SIN validar. Una factura validada por la DIAN
   * es inmutable: para anularla se emite una nota crédito, nunca se borra.
   */
  async deleteBillByReference(referenceCode: string): Promise<unknown> {
    try {
      const res = await this.factusClient.delete<unknown>(
        `/v2/bills/destroy/reference/${encodeURIComponent(referenceCode)}`,
      );
      this.logger.warn(
        `Factura con reference_code "${referenceCode}" eliminada de Factus.`,
      );
      return res;
    } catch (error) {
      if (error instanceof FactusApiError) {
        const detail =
          (error.responseData as any)?.message ?? `HTTP ${error.statusCode}`;
        throw new BadRequestException(
          `No se pudo eliminar en Factus la factura con reference_code ` +
            `"${referenceCode}": ${detail}. Recuerda que solo se pueden eliminar ` +
            `facturas NO validadas por la DIAN.`,
        );
      }
      throw error;
    }
  }

  // Cache en memoria de los rangos de venta de la cuenta.
  //
  // Con TTL a propósito: una resolución DIAN vence en una fecha concreta y su
  // reemplazo se crea desde el portal de Factus, fuera de esta aplicación. Con
  // un cache eterno el backend seguía viendo la lista vieja y había que
  // reiniciarlo para que descubriera el rango nuevo, justo el día en que la
  // facturación está caída y nadie quiere reiniciar nada.
  private static readonly RANGES_TTL_MS = 10 * 60 * 1000; // 10 min
  private rangesCache: { at: number; ranges: FactusNumberingRange[] } | null =
    null;

  /** Descarta el cache de rangos: úsalo tras crear/activar un rango en Factus. */
  invalidateRangesCache(): void {
    this.rangesCache = null;
    this.logger.log('Cache de rangos de numeración invalidado.');
  }

  /**
   * TODOS los rangos de la cuenta, de cualquier documento (vigentes o no).
   * Recorre la paginación: Factus devuelve 10 por página y una cuenta con
   * varias resoluciones históricas supera ese tope fácilmente.
   *
   * Se cachean sin filtrar para que la vista de numeración del contador y la
   * resolución de rango al emitir compartan la misma llamada.
   */
  async fetchAllRanges(): Promise<FactusNumberingRange[]> {
    const fresh =
      this.rangesCache &&
      Date.now() - this.rangesCache.at < FactusBillsService.RANGES_TTL_MS;
    if (fresh) return this.rangesCache!.ranges;

    const all: FactusNumberingRange[] = [];
    let page = 1;
    let lastPage = 1;
    do {
      const res = await this.factusClient.get<any>('/v2/numbering-ranges', {
        params: { page },
      });
      const body = res?.data ?? res;
      const chunk: FactusNumberingRange[] = body?.data ?? [];
      all.push(...(Array.isArray(chunk) ? chunk : [chunk]));
      lastPage = Number(body?.pagination?.last_page ?? 1) || 1;
      page++;
    } while (page <= lastPage && page <= 20); // tope defensivo

    this.rangesCache = { at: Date.now(), ranges: all };
    this.logger.log(
      `Rangos de numeración en Factus: ${
        all
          .map(
            (r) =>
              `id=${r.id}(${r.document}/${r.prefix}) activo=${r.is_active} vencido=${r.is_expired}`,
          )
          .join(', ') || 'NINGUNO'
      }`,
    );
    return all;
  }

  /**
   * Clasifica un rango por el NOMBRE del documento, que Factus devuelve como
   * texto libre. Ojo con "Nota de Ajuste Documento Soporte": contiene la
   * palabra "soporte" y no es un rango de documento soporte, por eso se
   * excluye explícitamente.
   */
  private static matchesKind(
    documentName: unknown,
    kind: FactusDocumentKind,
  ): boolean {
    const s = String(documentName ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, ''); // sin tildes: 'credito' == 'crédito'
    switch (kind) {
      case 'sales':
        return s.includes('factura') && s.includes('venta');
      case 'creditNote':
        return s.includes('nota') && s.includes('credito');
      case 'debitNote':
        return s.includes('nota') && s.includes('debito');
      case 'supportDocument':
        return s.includes('soporte') && !s.includes('ajuste');
      case 'adjustmentNote':
        // "Nota de Ajuste Documento Soporte". Lleva "soporte" dentro, por eso
        // el caso de arriba lo excluye explícitamente: sin ese `!ajuste` los
        // dos rangos se clasificarían como documento soporte y el documento
        // soporte podría acabar numerado con el rango de las notas de ajuste.
        return s.includes('nota') && s.includes('ajuste');
    }
  }

  /** Nombre humano del documento, para los mensajes de error. */
  private static kindLabel(kind: FactusDocumentKind): string {
    switch (kind) {
      case 'sales':
        return 'Factura de Venta';
      case 'creditNote':
        return 'Nota Crédito';
      case 'debitNote':
        return 'Nota Débito';
      case 'supportDocument':
        return 'Documento Soporte';
      case 'adjustmentNote':
        return 'Nota de Ajuste a Documento Soporte';
    }
  }

  /** Rangos de un tipo de documento (vigentes o no). */
  async fetchRangesByKind(
    kind: FactusDocumentKind,
  ): Promise<FactusNumberingRange[]> {
    const all = await this.fetchAllRanges();
    return all.filter((r) => FactusBillsService.matchesKind(r.document, kind));
  }

  private static isTrue(v: unknown): boolean {
    return v === 1 || v === true || v === '1';
  }

  /** Umbral para avisar de un vencimiento próximo, en días. */
  private static readonly EXPIRING_SOON_DAYS = 30;

  /**
   * Los rangos de la cuenta con lo que necesita ver el contador: en qué número
   * va cada documento y cuánta vigencia le queda.
   *
   * Existe porque el rango de facturación venció en producción sin que nadie se
   * enterara: Factus sigue reportando `is_active: true` en un rango caducado y
   * en el portal se ve normal, así que la única señal fiable es `is_expired` /
   * `end_date`. Aquí se convierte en un semáforo explícito.
   */
  async getRangesOverview(): Promise<FactusNumberingRangeOverview[]> {
    const ranges = await this.fetchAllRanges();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return ranges.map((r) => {
      const kind: FactusDocumentKind | null =
        (
          [
            'sales',
            'creditNote',
            'debitNote',
            'supportDocument',
            'adjustmentNote',
          ] as const
        ).find((k) => FactusBillsService.matchesKind(r.document, k)) ?? null;

      const isActive = FactusBillsService.isTrue(r.is_active);
      const isExpired = FactusBillsService.isTrue(r.is_expired);

      let daysToExpire: number | null = null;
      if (r.end_date) {
        const end = new Date(r.end_date);
        if (!Number.isNaN(end.getTime())) {
          end.setHours(0, 0, 0, 0);
          daysToExpire = Math.round(
            (end.getTime() - startOfToday.getTime()) / 86_400_000,
          );
        }
      }

      // El vencimiento manda sobre el resto: un rango caducado es inutilizable
      // aunque Factus lo siga reportando activo.
      let status: FactusNumberingRangeOverview['status'];
      if (isExpired || (daysToExpire !== null && daysToExpire < 0)) {
        status = 'expired';
      } else if (!isActive) {
        status = 'inactive';
      } else if (
        daysToExpire !== null &&
        daysToExpire <= FactusBillsService.EXPIRING_SOON_DAYS
      ) {
        status = 'expiring';
      } else {
        status = 'ok';
      }

      // OJO: los rangos de NOTA CRÉDITO vienen con from/to en null — la DIAN no
      // expide resolución para ellas y en Factus se crean solo con prefijo y
      // consecutivo. Calcularlos con `Number(null)` daba 0, así que la vista los
      // pintaba como "0 – 0, quedan 0", es decir, un rango agotado. Sin tope no
      // hay restantes que contar: va null y la vista muestra "N/A", igual que el
      // portal de Factus.
      const from = r.from == null ? null : Number(r.from);
      const to = r.to == null ? null : Number(r.to);

      return {
        id: r.id,
        kind,
        documentName: r.document,
        prefix: r.prefix,
        from,
        to,
        current: Number(r.current),
        remaining: to == null ? null : Math.max(0, to - Number(r.current) + 1),
        resolutionNumber: r.resolution_number ?? null,
        startDate: r.start_date ?? null,
        endDate: r.end_date ?? null,
        isActive,
        isExpired,
        daysToExpire,
        status,
      };
    });
  }

  /** Rangos usables de un tipo: activos y NO vencidos. */
  private async fetchActiveRangesByKind(
    kind: FactusDocumentKind,
  ): Promise<FactusNumberingRange[]> {
    const ranges = await this.fetchRangesByKind(kind);
    return ranges.filter(
      (r) =>
        FactusBillsService.isTrue(r.is_active) &&
        !FactusBillsService.isTrue(r.is_expired),
    );
  }

  /**
   * Resuelve el numbering_range_id a usar para emitir un documento:
   *  - Si `preferredId` (el configurado en Organizational para ese tipo) existe
   *    entre los rangos de ESE documento en ESTE entorno, se respeta (override
   *    manual / multi-sucursal).
   *  - Si no existe (típico: 2621 de sandbox en una cuenta de producción) o no
   *    se configuró, se auto-resuelve el rango activo del tipo pedido.
   * Así funciona igual en sandbox y producción sin hardcodear el id.
   */
  async resolveNumberingRangeId(
    kind: FactusDocumentKind,
    preferredId?: number | null,
  ): Promise<number> {
    const label = FactusBillsService.kindLabel(kind);
    const ranges = await this.fetchActiveRangesByKind(kind);
    if (ranges.length === 0) {
      // Distinguimos "no hay ninguno" de "los que hay están vencidos": son dos
      // problemas distintos y el segundo confundía, porque el rango vencido
      // sigue figurando como ACTIVO en Factus y en el portal se ve normal.
      const all = await this.fetchRangesByKind(kind);
      const expired = all.filter((r) => FactusBillsService.isTrue(r.is_expired));
      if (expired.length) {
        const detail = expired
          .map((r) => `id=${r.id} (prefijo ${r.prefix})`)
          .join(', ');
        throw new BadRequestException(
          `El rango de numeración de "${label}" está VENCIDO: ${detail}. ` +
            'La resolución DIAN caducó: hay que solicitar una nueva a la DIAN y ' +
            'crear el rango en Factus (indicando como consecutivo actual el número ' +
            'siguiente al último emitido). Hasta entonces no se puede emitir ' +
            'este documento.',
        );
      }
      // Las NOTAS (crédito, débito, ajuste) no llevan resolución DIAN: su rango
      // se crea en Factus solo con `document`, `prefix` y `current`. Decirle al
      // usuario que tramite una resolución para ellas lo manda a un trámite que
      // no existe, así que el consejo cambia según el documento.
      const needsResolution = kind === 'sales' || kind === 'supportDocument';
      throw new BadRequestException(
        `Factus no tiene un rango de numeración de "${label}" activo. ` +
          `Cree el rango en Factus (document ${RANGE_DOCUMENT_CODE[kind]}) antes de emitir. ` +
          (needsResolution
            ? 'Necesita número de resolución DIAN. Si la resolución ya existe pero ' +
              'Factus la rechaza al registrarla, falta asociarla al software: eso ' +
              'lo resuelve el soporte de Factus.'
            : 'Este documento NO necesita resolución DIAN: basta prefijo y ' +
              'consecutivo inicial, y el rango no vence.'),
      );
    }
    if (preferredId && ranges.some((r) => r.id === preferredId)) {
      return preferredId;
    }
    if (preferredId) {
      this.logger.warn(
        `El rango configurado id=${preferredId} no existe entre los de "${label}" ` +
          `en este entorno Factus; usando el auto-resuelto id=${ranges[0].id} (${ranges[0].prefix}).`,
      );
    }
    if (ranges.length > 1) {
      this.logger.warn(
        `Hay ${ranges.length} rangos de "${label}" activos (sucursales); ` +
          `usando id=${ranges[0].id}. Configúrelo en Organizational para fijar uno.`,
      );
    }
    return ranges[0].id;
  }

  private validateLocally(data: Record<string, unknown>): void {
    if (!String(data.reference_code ?? '').trim()) {
      throw new BadRequestException('reference_code es requerido');
    }

    const customer = data.customer as Record<string, string> | undefined;
    if (customer) {
      const id = String(customer.identification ?? '').trim();
      if (!id) {
        throw new BadRequestException('customer.identification es requerido');
      }
      // Solo los documentos colombianos son puramente numéricos. Un PASAPORTE
      // (41) o una cédula de extranjería (22) llevan letras de forma legítima
      // —"PAW358496", "X0W28A74"— y exigirles dígitos hacía imposible facturar
      // a huéspedes extranjeros, que aquí son una parte grande de los clientes.
      // La regla numérica solo aplica a CC, NIT, TI, RC y TE.
      const NUMERIC_DOC_CODES = ['13', '31', '12', '11', '21'];
      const docCode = String(customer.identification_document_code ?? '');
      if (NUMERIC_DOC_CODES.includes(docCode) && !/^\d+$/.test(id)) {
        throw new BadRequestException(
          `customer.identification debe contener solo números para el tipo de ` +
            `documento ${docCode} (recibido: "${id}"). Si es un pasaporte, ` +
            `corrige el tipo de documento del cliente.`,
        );
      }
      if (!/^[A-Za-z0-9]+$/.test(id)) {
        throw new BadRequestException(
          `customer.identification solo admite letras y números, sin espacios ni ` +
            `guiones (recibido: "${id}").`,
        );
      }
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
