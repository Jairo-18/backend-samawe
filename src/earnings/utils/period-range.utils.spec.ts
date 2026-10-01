import {
  bucketCount,
  bucketIndex,
  bucketStart,
  periodRange,
  validateCustomRange,
} from './period-range.utils';

const iso = (d: Date) => d.toISOString();

// Miércoles 30 sep 2026, 5:00 pm en Colombia (= 22:00 UTC).
const NOW = new Date('2026-09-30T22:00:00.000Z');

describe('periodRange (hora de Colombia, sin depender de la zona del proceso)', () => {
  it('diario: de las 00:00 a las 24:00 de Colombia', () => {
    const r = periodRange('daily', NOW);
    expect(iso(r.start)).toBe('2026-09-30T05:00:00.000Z');
    expect(iso(r.end)).toBe('2026-10-01T05:00:00.000Z');
  });

  it('a las 10 pm de Colombia (ya es el día siguiente en UTC) sigue siendo "hoy"', () => {
    const r = periodRange('daily', new Date('2026-10-01T03:00:00.000Z'));
    expect(iso(r.start)).toBe('2026-09-30T05:00:00.000Z');
  });

  it('diario anterior = ayer', () => {
    expect(iso(periodRange('daily', NOW, 1).start)).toBe(
      '2026-09-29T05:00:00.000Z',
    );
  });

  it('semanal: de lunes a domingo', () => {
    const r = periodRange('weekly', NOW);
    expect(iso(r.start)).toBe('2026-09-28T05:00:00.000Z'); // lunes 28
    expect(iso(r.end)).toBe('2026-10-05T05:00:00.000Z');
  });

  it('un domingo pertenece a la semana que empezó el lunes anterior', () => {
    const sunday = new Date('2026-10-04T20:00:00.000Z');
    expect(iso(periodRange('weekly', sunday).start)).toBe(
      '2026-09-28T05:00:00.000Z',
    );
  });

  it('semana anterior', () => {
    expect(iso(periodRange('weekly', NOW, 1).start)).toBe(
      '2026-09-21T05:00:00.000Z',
    );
  });

  it('mensual: septiembre tiene 30 casillas', () => {
    const r = periodRange('monthly', NOW);
    expect(iso(r.start)).toBe('2026-09-01T05:00:00.000Z');
    expect(iso(r.end)).toBe('2026-10-01T05:00:00.000Z');
    expect(bucketCount('monthly', r)).toBe(30);
  });

  it('mensual: febrero 2026 tiene 28 y el mes anterior a enero cruza de año', () => {
    const feb = periodRange('monthly', new Date('2026-02-10T15:00:00.000Z'));
    expect(bucketCount('monthly', feb)).toBe(28);
    const prev = periodRange('monthly', new Date('2026-01-15T15:00:00.000Z'), 1);
    expect(iso(prev.start)).toBe('2025-12-01T05:00:00.000Z');
    expect(bucketCount('monthly', prev)).toBe(31);
  });

  it('anual: 12 casillas', () => {
    const r = periodRange('yearly', NOW);
    expect(iso(r.start)).toBe('2026-01-01T05:00:00.000Z');
    expect(iso(r.end)).toBe('2027-01-01T05:00:00.000Z');
    expect(bucketCount('yearly', r)).toBe(12);
    expect(iso(periodRange('yearly', NOW, 1).start)).toBe(
      '2025-01-01T05:00:00.000Z',
    );
  });
});

describe('bucketIndex / bucketStart', () => {
  it('diario: la hora de Colombia', () => {
    const r = periodRange('daily', NOW);
    expect(bucketIndex('daily', r, new Date('2026-09-30T05:00:00.000Z'))).toBe(0);
    expect(bucketIndex('daily', r, new Date('2026-09-30T22:00:00.000Z'))).toBe(17);
    expect(bucketIndex('daily', r, new Date('2026-10-01T04:59:59.000Z'))).toBe(23);
  });

  it('fuera del rango devuelve -1 (el borde final es exclusivo)', () => {
    const r = periodRange('daily', NOW);
    expect(bucketIndex('daily', r, new Date('2026-09-30T04:59:59.000Z'))).toBe(-1);
    expect(bucketIndex('daily', r, new Date('2026-10-01T05:00:00.000Z'))).toBe(-1);
  });

  it('semanal: lunes = 0 … miércoles = 2', () => {
    const r = periodRange('weekly', NOW);
    expect(bucketIndex('weekly', r, NOW)).toBe(2);
  });

  it('mensual: el 30 es la casilla 29', () => {
    const r = periodRange('monthly', NOW);
    expect(bucketIndex('monthly', r, NOW)).toBe(29);
  });

  it('anual: el cambio de mes cae a medianoche de Colombia, no de UTC', () => {
    const r = periodRange('yearly', NOW);
    expect(bucketIndex('yearly', r, new Date('2026-10-01T04:59:00.000Z'))).toBe(8);
    expect(bucketIndex('yearly', r, new Date('2026-10-01T05:00:00.000Z'))).toBe(9);
  });

  it('bucketStart devuelve el instante real en que empieza la casilla', () => {
    const d = periodRange('daily', NOW);
    expect(iso(bucketStart('daily', d, 17))).toBe('2026-09-30T22:00:00.000Z');
    const m = periodRange('monthly', NOW);
    expect(iso(bucketStart('monthly', m, 29))).toBe('2026-09-30T05:00:00.000Z');
    const y = periodRange('yearly', NOW);
    expect(iso(bucketStart('yearly', y, 8))).toBe('2026-09-01T05:00:00.000Z');
  });
});

describe('rango libre (custom)', () => {
  const short = { from: '2026-09-10', to: '2026-09-19' }; // 10 días
  const long = { from: '2026-01-15', to: '2026-09-30' }; // más de 92 días

  it('ambas fechas son inclusivas y van en hora de Colombia', () => {
    const r = periodRange('custom', NOW, 0, short);
    expect(iso(r.start)).toBe('2026-09-10T05:00:00.000Z');
    expect(iso(r.end)).toBe('2026-09-20T05:00:00.000Z');
  });

  it('el período anterior es el de la misma duración justo antes', () => {
    const prev = periodRange('custom', NOW, 1, short);
    expect(iso(prev.start)).toBe('2026-08-31T05:00:00.000Z');
    expect(iso(prev.end)).toBe('2026-09-10T05:00:00.000Z');
  });

  it('un rango corto se agrupa por día', () => {
    const r = periodRange('custom', NOW, 0, short);
    expect(bucketCount('custom', r)).toBe(10);
    expect(bucketIndex('custom', r, new Date('2026-09-12T15:00:00.000Z'))).toBe(2);
    expect(iso(bucketStart('custom', r, 2))).toBe('2026-09-12T05:00:00.000Z');
  });

  it('un rango largo se agrupa por mes', () => {
    const r = periodRange('custom', NOW, 0, long);
    expect(bucketCount('custom', r)).toBe(9); // enero … septiembre
    expect(bucketIndex('custom', r, new Date('2026-03-10T15:00:00.000Z'))).toBe(2);
  });

  it('la primera casilla mensual empieza donde empieza el rango, no el día 1', () => {
    const r = periodRange('custom', NOW, 0, long);
    expect(iso(bucketStart('custom', r, 0))).toBe('2026-01-15T05:00:00.000Z');
    expect(iso(bucketStart('custom', r, 1))).toBe('2026-02-01T05:00:00.000Z');
  });

  it('un instante fuera del rango no cae en ninguna casilla', () => {
    const r = periodRange('custom', NOW, 0, short);
    expect(bucketIndex('custom', r, new Date('2026-09-20T05:00:00.000Z'))).toBe(-1);
  });
});

describe('validateCustomRange', () => {
  it('acepta un rango válido', () => {
    expect(validateCustomRange({ from: '2026-09-01', to: '2026-09-30' })).toBeNull();
    expect(validateCustomRange({ from: '2026-09-05', to: '2026-09-05' })).toBeNull();
  });

  it.each([
    [undefined, /Falta/],
    [{ from: '2026/09/01', to: '2026-09-30' }, /formato/],
    [{ from: '2026-02-31', to: '2026-03-05' }, /formato/], // 31 de febrero no existe
    [{ from: '2026-09-30', to: '2026-09-01' }, /anterior/],
    [{ from: '2020-01-01', to: '2026-09-30' }, /superar/],
  ])('rechaza %j', (range, message) => {
    expect(validateCustomRange(range as any)).toMatch(message as RegExp);
  });
});
