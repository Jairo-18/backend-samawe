/**
 * Comprobación del clasificador y el semáforo de `getRangesOverview()` con un
 * FactusClient falso: usa los rangos reales de la cuenta de sandbox más los de
 * producción que el contador nos pasó, sin llamar a la red.
 *
 * Ejecutar: npx ts-node scripts/check-ranges-overview.ts
 */
import { FactusBillsService } from '../src/factus/services/factus-bills.service';

const RANGES = [
  // Sandbox (reales, GET /v2/numbering-ranges)
  { id: 2622, document: 'Nota Crédito', prefix: 'NC', from: 0, to: 16000000, current: 3, resolution_number: '', start_date: '2019-01-19', end_date: '2030-01-19', is_expired: false, is_active: true },
  { id: 2623, document: 'Nota Débito', prefix: 'ND', from: 0, to: 16000000, current: 1, resolution_number: '', start_date: '2019-01-19', end_date: '2030-01-19', is_expired: false, is_active: true },
  { id: 2624, document: 'Nota de Ajuste Documento Soporte', prefix: 'NA', from: 0, to: 16000000, current: 1, resolution_number: '', start_date: '2019-01-19', end_date: '2030-01-19', is_expired: false, is_active: true },
  { id: 2621, document: 'Factura de Venta', prefix: 'SETP', from: 990000000, to: 995000000, current: 990000013, resolution_number: '18760000001', start_date: '2019-01-19', end_date: '2030-01-19', is_expired: false, is_active: true },
  // Producción (los que hay hoy en la cuenta real)
  { id: 2073, document: 'Factura de Venta', prefix: 'A', from: 773, to: 10000, current: 773, resolution_number: '18764090114255', start_date: '2025-03-07', end_date: '2026-09-07', is_expired: true, is_active: true },
  { id: 3001, document: 'Documento Soporte', prefix: 'DSE', from: 43, to: 600, current: 43, resolution_number: '18764105274745', start_date: '2026-01-30', end_date: '2027-01-30', is_expired: false, is_active: true },
  { id: 3002, document: 'Factura de Venta', prefix: 'A', from: 849, to: 10000, current: 849, resolution_number: 'nueva', start_date: '2026-03-10', end_date: '2028-03-10', is_expired: false, is_active: true },
];

const fakeClient = {
  get: async () => ({ data: { data: RANGES, pagination: { last_page: 1 } } }),
} as any;

const service = new FactusBillsService(fakeClient, { get: () => undefined } as any);

const EXPECTED_KIND: Record<number, string | null> = {
  2622: 'creditNote',
  2623: null, // Nota Débito: no la emitimos todavía
  2624: null, // Nota de Ajuste: contiene "soporte" pero NO es documento soporte
  2621: 'sales',
  2073: 'sales',
  3001: 'supportDocument',
  3002: 'sales',
};

const EXPECTED_STATUS: Record<number, string> = {
  2622: 'ok',
  2623: 'ok',
  2624: 'ok',
  2621: 'ok',
  2073: 'expired', // resolución vencida el 07-09-2026
  3001: 'expiring', // vence 30-01-2027… depende de hoy; se valida aparte
  3002: 'ok',
};

(async () => {
  const overview = await service.getRangesOverview();
  let failures = 0;

  for (const r of overview) {
    const expectedKind = EXPECTED_KIND[r.id];
    const kindOk = r.kind === expectedKind;
    if (!kindOk) failures++;
    console.log(
      `${kindOk ? 'OK  ' : 'FALLA'} id=${r.id} "${r.documentName}" → kind=${r.kind} ` +
        `(esperado ${expectedKind}) | status=${r.status} | va en ${r.current} | ` +
        `quedan ${r.remaining} | vence en ${r.daysToExpire} días`,
    );
  }

  // El vencido debe salir como 'expired' pase lo que pase.
  const expired = overview.find((r) => r.id === 2073);
  if (expired?.status !== 'expired') {
    console.log(`FALLA el rango 2073 debería estar 'expired', está '${expired?.status}'`);
    failures++;
  }

  // Y la resolución de rango por tipo debe elegir el vigente, no el vencido.
  const salesId = await service.resolveNumberingRangeId('sales');
  const supportId = await service.resolveNumberingRangeId('supportDocument');
  console.log(`\nresolveNumberingRangeId('sales') → ${salesId} (debe ser 2621 o 3002, nunca 2073)`);
  console.log(`resolveNumberingRangeId('supportDocument') → ${supportId} (debe ser 3001)`);
  if (salesId === 2073) failures++;
  if (supportId !== 3001) failures++;

  // Un preferido inválido no debe imponerse.
  const forced = await service.resolveNumberingRangeId('supportDocument', 2621);
  console.log(`preferido inválido (2621 es de ventas) para soporte → ${forced} (debe ser 3001)`);
  if (forced !== 3001) failures++;

  console.log(failures === 0 ? '\nTODO OK' : `\n${failures} FALLAS`);
  process.exit(failures === 0 ? 0 : 1);
})();
