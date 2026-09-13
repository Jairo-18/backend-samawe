import {
  InvoiceNoteTotals,
  netPurchaseTotal,
  netSaleTotal,
} from './invoice-notes.utils';

const totals = (
  credited: [number, number][] = [],
  debited: [number, number][] = [],
  adjusted: [number, number][] = [],
): InvoiceNoteTotals => ({
  credited: new Map(credited),
  debited: new Map(debited),
  adjusted: new Map(adjusted),
});

describe('netSaleTotal', () => {
  it('resta la nota crédito', () => {
    expect(netSaleTotal(1000, 970, totals([[970, 300]]))).toBe(700);
  });

  it('suma la nota débito', () => {
    expect(netSaleTotal(1000, 970, totals([], [[970, 50]]))).toBe(1050);
  });

  it('aplica crédito y débito a la vez', () => {
    expect(netSaleTotal(1000, 970, totals([[970, 300]], [[970, 50]]))).toBe(750);
  });

  it('una nota crédito total deja la venta en cero', () => {
    expect(netSaleTotal(500, 970, totals([[970, 500]]))).toBe(0);
  });

  it('ignora las notas de ajuste: no aplican a ventas', () => {
    // La nota de ajuste cuelga de un documento soporte (compra). Si se colara
    // aquí restaría dos veces: una en ventas y otra en compras.
    expect(netSaleTotal(1000, 970, totals([], [], [[970, 400]]))).toBe(1000);
  });

  it('sin notas devuelve el bruto', () => {
    expect(netSaleTotal(1000, 970, totals())).toBe(1000);
  });
});

describe('netPurchaseTotal', () => {
  it('resta la nota de ajuste', () => {
    // Es el caso real: NA2 sobre la compra 824. Antes no descontaba y
    // `totalInvoiceBuy` quedaba inflado.
    expect(netPurchaseTotal(69000, 824, totals([], [], [[824, 69000]]))).toBe(0);
  });

  it('resta un ajuste parcial', () => {
    expect(netPurchaseTotal(69000, 824, totals([], [], [[824, 9000]]))).toBe(
      60000,
    );
  });

  it('ignora crédito y débito: no aplican a compras', () => {
    expect(
      netPurchaseTotal(69000, 824, totals([[824, 100]], [[824, 200]])),
    ).toBe(69000);
  });

  it('sin notas devuelve el bruto', () => {
    expect(netPurchaseTotal(69000, 824, totals())).toBe(69000);
  });
});

describe('tope de lo restado (redondeo de Factus)', () => {
  it('una anulacion total unos centavos mayor no deja la compra en negativo', () => {
    // Caso real: NA2 = $155.630,18 sobre una compra de $155.630,08. El total de
    // la nota sale del redondeo por linea de Factus y el de la factura no.
    expect(netPurchaseTotal(155630.08, 824, totals([], [], [[824, 155630.18]])))
      .toBe(0);
  });

  it('lo mismo del lado de las ventas', () => {
    expect(netSaleTotal(500, 970, totals([[970, 500.05]]))).toBe(0);
  });

  it('el tope no come la nota debito: esa suma por encima', () => {
    expect(netSaleTotal(500, 970, totals([[970, 500.05]], [[970, 120]]))).toBe(
      120,
    );
  });
});
