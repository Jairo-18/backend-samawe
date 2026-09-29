import { round2, sumFactusItemsTotal, FactusPayloadItem } from './factus-math.utils';

describe('round2', () => {
  it('redondea a 2 decimales', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });

  it('corrige el error de coma flotante clásico', () => {
    // 1.1 + 2.2 da 3.3000000000000003 en punto flotante puro.
    expect(round2(1.1 + 2.2)).toBe(3.3);
  });

  it('no toca un número ya redondeado', () => {
    expect(round2(10)).toBe(10);
    expect(round2(10.5)).toBe(10.5);
  });
});

describe('sumFactusItemsTotal', () => {
  const item = (
    quantity: unknown,
    price: unknown,
    discount_rate: unknown = '0',
    rate: unknown = '0',
  ): FactusPayloadItem => ({
    quantity,
    price,
    discount_rate,
    taxes: [{ rate }],
  });

  it('un ítem sin descuento ni impuesto: total = cantidad * precio', () => {
    expect(sumFactusItemsTotal([item(2, 100)])).toBe(200);
  });

  it('aplica el descuento antes del impuesto', () => {
    // 100 * (1 - 10%) = 90 neto, + 19% de IVA sobre 90 = 17.10 -> 107.10
    expect(sumFactusItemsTotal([item(1, 100, 10, 19)])).toBe(107.1);
  });

  it('sin taxes[0], asume rate 0', () => {
    expect(
      sumFactusItemsTotal([{ quantity: 1, price: 100, discount_rate: '0', taxes: [] }]),
    ).toBe(100);
  });

  it('redondea NETO e IMPUESTO de cada línea antes de sumar, no el total al final', () => {
    // Caso real que motivó centralizar esto: con 3 ítems de $33.33 al 19%,
    // sumar todo primero y redondear al final da un resultado distinto a
    // redondear neto+impuesto de cada línea y después sumar — y Factus hace
    // lo segundo. Verificamos contra el resultado esperado calculado a mano
    // (33.33 neto + 6.33 de IVA = 39.66 por línea, x3 = 118.98), tolerando
    // el residuo de punto flotante de sumar 3 veces un decimal binario
    // inexacto (toFixed(2), que es como se usa el resultado en producción,
    // lo redondearía igual a "118.98").
    const items = [item(1, 33.33, 0, 19), item(1, 33.33, 0, 19), item(1, 33.33, 0, 19)];

    expect(sumFactusItemsTotal(items)).toBeCloseTo(118.98, 2);
  });

  it('varios ítems se acumulan', () => {
    expect(sumFactusItemsTotal([item(1, 50), item(1, 25)])).toBe(75);
  });

  it('sin ítems, el total es 0', () => {
    expect(sumFactusItemsTotal([])).toBe(0);
  });
});
