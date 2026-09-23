import { FactusInvoiceService } from './factus-invoice.service';
import { DocumentLockService } from '../../shared/services/documentLock.service';

/**
 * El lock de emisión por factura.
 *
 * Hasta el 14 sep 2026 `sendInvoiceToFactus` era el ÚNICO camino de emisión sin
 * lock: las cuatro notas y el documento soporte lo tenían y la factura no, justo
 * el documento más caro de duplicar — una factura repetida ante la DIAN no se
 * puede borrar (ver el incidente A773 en `factus/RESUMEN-Factus.md` §12).
 *
 * El guard de `invoice.factusNumber` no bastaba: dos peticiones simultáneas
 * pasan las dos por el `if` antes de que ninguna haya guardado.
 *
 * Los tests atacan el lock en aislamiento: los pasos internos (validación,
 * payload, persistencia) se sustituyen, porque lo que se fija aquí es la
 * SERIALIZACIÓN, no cómo se construye el documento.
 */
describe('FactusInvoiceService — lock de emisión', () => {
  const RESULT = {
    billNumber: 'A900',
    referenceCode: '00009',
    isValidated: true,
    cufe: 'cufe-x',
    qrCode: null,
    publicUrl: null,
    createdAt: '2026-09-14T00:00:00.000Z',
  };

  /**
   * Servicio con los pasos internos sustituidos y una factura mutable
   * compartida: `saveFactusResult` le pone el `factusNumber`, igual que en
   * producción, para que el guard de idempotencia se comporte de verdad.
   */
  const buildService = (delayMs = 20) => {
    const invoice: Record<string, unknown> = {
      invoiceId: 9,
      code: '00009',
      factusNumber: undefined,
      createdAt: new Date('2026-09-14T00:00:00.000Z'),
    };

    const createAndValidateBill = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({}), delayMs)),
    );

    // El lock ya no vive dentro del servicio: se inyecta `DocumentLockService`,
    // que encola en memoria y, si hay `REDIS_URL`, toma además un lock
    // distribuido. Aquí se construye con `null` como cliente Redis, que es
    // justo el camino en memoria — el mismo comportamiento que estos tests
    // fijaban antes, ahora verificado a través del servicio compartido.
    const service = new FactusInvoiceService(
      {} as never,
      { createAndValidateBill, resolveNumberingRangeId: jest.fn(async () => 1) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      new DocumentLockService(null),
    );

    const s = service as unknown as Record<string, unknown>;
    s.loadInvoice = jest.fn(async () => invoice);
    s.validateInvoiceForFactus = jest.fn();
    s.buildPayload = jest.fn(() => ({}));
    s.extractResult = jest.fn(() => ({ ...RESULT }));
    s.dispatchPostEmissionNotifications = jest.fn();
    // Fiel al real: persiste número Y CUFE (de ahí los lee el guard de
    // idempotencia para responder sin reemitir).
    s.saveFactusResult = jest.fn(async () => {
      invoice.factusNumber = RESULT.billNumber;
      invoice.factusCufe = RESULT.cufe;
      invoice.factusSentAt = new Date(RESULT.createdAt);
    });

    return { service, invoice, createAndValidateBill };
  };

  it('dos emisiones simultáneas de la misma factura envían UNA sola vez a la DIAN', async () => {
    const { service, createAndValidateBill } = buildService();

    // En paralelo de verdad: sin lock ambas pasarían el guard de factusNumber
    // antes de que ninguna hubiera guardado, y emitirían dos veces.
    const [a, b] = await Promise.all([
      service.sendInvoiceToFactus(9),
      service.sendInvoiceToFactus(9),
    ]);

    expect(createAndValidateBill).toHaveBeenCalledTimes(1);
    expect(a.billNumber).toBe('A900');
    expect(b.billNumber).toBe('A900');
  });

  it('la segunda llamada devuelve la factura ya emitida, no una nueva', async () => {
    const { service, createAndValidateBill } = buildService();

    await service.sendInvoiceToFactus(9);
    const second = await service.sendInvoiceToFactus(9);

    expect(createAndValidateBill).toHaveBeenCalledTimes(1);
    expect(second.isValidated).toBe(true);
    expect(second.cufe).toBe('cufe-x');
  });

  it('diez clics a la vez siguen emitiendo una sola factura', async () => {
    const { service, createAndValidateBill } = buildService(5);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => service.sendInvoiceToFactus(9)),
    );

    expect(createAndValidateBill).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.billNumber === 'A900')).toBe(true);
  });

  it('un fallo en la emisión libera el lock y no bloquea a la siguiente', async () => {
    const { service, createAndValidateBill } = buildService();
    createAndValidateBill.mockRejectedValueOnce(new Error('DIAN caída'));

    await expect(service.sendInvoiceToFactus(9)).rejects.toThrow('DIAN caída');

    // Si el `finally` no liberase el lock, esta llamada quedaría colgada.
    const retry = await service.sendInvoiceToFactus(9);
    expect(retry.billNumber).toBe('A900');
    expect(createAndValidateBill).toHaveBeenCalledTimes(2);
  });

  it('facturas distintas NO se bloquean entre sí', async () => {
    const { service, createAndValidateBill } = buildService(40);
    const s = service as unknown as Record<string, unknown>;

    // Cada id con su propia factura: el lock es por factura, no global.
    const invoices = new Map<number, Record<string, unknown>>();
    s.loadInvoice = jest.fn(async (id: number) => {
      if (!invoices.has(id)) invoices.set(id, { invoiceId: id, code: `0000${id}` });
      return invoices.get(id);
    });
    s.saveFactusResult = jest.fn(async (inv: Record<string, unknown>) => {
      inv.factusNumber = `A90${inv.invoiceId as number}`;
    });

    const started = Date.now();
    await Promise.all([
      service.sendInvoiceToFactus(1),
      service.sendInvoiceToFactus(2),
      service.sendInvoiceToFactus(3),
    ]);
    const elapsed = Date.now() - started;

    expect(createAndValidateBill).toHaveBeenCalledTimes(3);
    // En serie serían ~120 ms; en paralelo ~40. El margen evita falsos rojos en
    // CI lento sin dejar pasar una serialización real.
    expect(elapsed).toBeLessThan(100);
  });
});
