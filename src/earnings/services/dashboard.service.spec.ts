import { DashboardService } from './dashboard.service';
import { CreditNote } from '../../shared/entities/creditNote.entity';
import { DebitNote } from '../../shared/entities/debitNote.entity';
import { AdjustmentNote } from '../../shared/entities/adjustmentNote.entity';

/**
 * El servicio se prueba sin base de datos: un repositorio falso devuelve las
 * filas "crudas" que devolvería la consulta y un `manager.find` falso, las
 * notas. Lo que se verifica es la REGLA: qué cuenta como venta o compra, el
 * neteo, el período anterior, las casillas y las anuladas.
 */
interface Row {
  invoiceId: number;
  total: string;
  createdAt: string;
  typeCode: string;
  payCode?: string | null;
  payName?: Record<string, string> | null;
}

interface DetailRow {
  detailId: number;
  subtotal: string;
  amount: string;
  name: string | null;
  category: string | null;
}

const make = (
  rows: Row[],
  notes: {
    credit?: { invoiceId: number; total: string; neutralizedDebitNoteIds?: number[] }[];
    debit?: { invoiceId: number; total: string; debitNoteId?: number }[];
    adjustment?: { invoiceId: number; total: string }[];
  } = {},
  details: DetailRow[] = [],
) => {
  const builder: any = {
    leftJoin: () => builder,
    where: () => builder,
    andWhere: () => builder,
    select: () => builder,
    getRawMany: async () => rows,
  };
  // Consulta de las líneas de factura (desgloses): otro query builder.
  const detailBuilder: any = {
    innerJoin: () => detailBuilder,
    leftJoin: () => detailBuilder,
    where: () => detailBuilder,
    andWhere: () => detailBuilder,
    select: () => detailBuilder,
    getRawMany: async () => details,
  };
  const repo: any = {
    createQueryBuilder: () => builder,
    manager: {
      getRepository: () => ({ createQueryBuilder: () => detailBuilder }),
      find: async (entity: unknown) =>
        entity === CreditNote
          ? (notes.credit ?? [])
          : entity === DebitNote
            ? (notes.debit ?? [])
            : entity === AdjustmentNote
              ? (notes.adjustment ?? [])
              : [],
    },
  };
  return new DashboardService(repo);
};

// Miércoles 30 sep 2026, 5 pm en Colombia. Mes actual = septiembre.
const NOW = new Date('2026-09-30T22:00:00.000Z');
const row = (
  invoiceId: number,
  total: number,
  createdAt: string,
  typeCode: string,
): Row => ({ invoiceId, total: String(total), createdAt, typeCode });

describe('DashboardService.getDashboard (mensual)', () => {
  it('suma ventas FV y FVE y compras FC y DSE; ignora las cotizaciones', async () => {
    const svc = make([
      row(1, 1000, '2026-09-10T15:00:00Z', 'FV'),
      row(2, 500, '2026-09-11T15:00:00Z', 'FVE'),
      row(3, 300, '2026-09-12T15:00:00Z', 'FC'),
      row(4, 200, '2026-09-13T15:00:00Z', 'DSE'),
      row(5, 9999, '2026-09-14T15:00:00Z', 'CO'),
    ]);
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.current.sales).toBe(1500);
    expect(r.current.purchases).toBe(500);
    expect(r.current.result).toBe(1000);
    expect(r.current.salesCount).toBe(2);
    expect(r.current.purchasesCount).toBe(2);
  });

  it('resta las notas crédito y suma las débito de las ventas', async () => {
    const svc = make([row(1, 1000, '2026-09-10T15:00:00Z', 'FVE')], {
      credit: [{ invoiceId: 1, total: '300' }],
      debit: [{ invoiceId: 1, total: '50', debitNoteId: 7 }],
    });
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.current.sales).toBe(750);
  });

  it('resta las notas de ajuste de las compras', async () => {
    const svc = make([row(1, 400, '2026-09-10T15:00:00Z', 'DSE')], {
      adjustment: [{ invoiceId: 1, total: '100' }],
    });
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.current.purchases).toBe(300);
  });

  it('una factura anulada vale 0 y no cuenta como venta', async () => {
    const svc = make(
      [
        row(1, 1000, '2026-09-10T15:00:00Z', 'FVE'),
        row(2, 600, '2026-09-11T15:00:00Z', 'FV'),
      ],
      { credit: [{ invoiceId: 1, total: '1000' }] },
    );
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.current.sales).toBe(600);
    expect(r.current.salesCount).toBe(1);
  });

  it('una nota débito sin neutralizar sigue sumando aunque la factura esté anulada', async () => {
    const svc = make([row(1, 1000, '2026-09-10T15:00:00Z', 'FVE')], {
      credit: [{ invoiceId: 1, total: '1000' }],
      debit: [{ invoiceId: 1, total: '120', debitNoteId: 7 }],
    });
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.current.sales).toBe(120);
  });

  it('una nota crédito que neutraliza la nota débito deja la venta en cero', async () => {
    const svc = make([row(1, 1000, '2026-09-10T15:00:00Z', 'FVE')], {
      credit: [{ invoiceId: 1, total: '1120', neutralizedDebitNoteIds: [7] }],
      debit: [{ invoiceId: 1, total: '120', debitNoteId: 7 }],
    });
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.current.sales).toBe(0);
    expect(r.current.salesCount).toBe(0);
  });

  it('separa el período anterior (agosto) del actual', async () => {
    const svc = make([
      row(1, 1000, '2026-09-10T15:00:00Z', 'FV'),
      row(2, 400, '2026-08-20T15:00:00Z', 'FV'),
      row(3, 150, '2026-08-21T15:00:00Z', 'FC'),
      row(4, 777, '2026-07-31T15:00:00Z', 'FV'), // dos meses atrás: fuera
    ]);
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.current.sales).toBe(1000);
    expect(r.previous.sales).toBe(400);
    expect(r.previous.purchases).toBe(150);
    expect(r.previous.result).toBe(250);
  });

  it('la serie mensual tiene una casilla por día, alineada con la del mes anterior', async () => {
    const svc = make([
      row(1, 1000, '2026-09-10T15:00:00Z', 'FV'), // 10 sep → casilla 9
      row(2, 400, '2026-08-10T15:00:00Z', 'FV'), // 10 ago → casilla 9
    ]);
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.series).toHaveLength(30); // septiembre
    expect(r.series[9].sales).toBe(1000);
    expect(r.series[9].previousSales).toBe(400);
    expect(r.series[0].sales).toBe(0);
  });

  it('la casilla 31 no tiene equivalente en un mes anterior más corto', async () => {
    // Octubre (31 días) frente a septiembre (30): el 31 no existe antes.
    const svc = make([]);
    const r = await svc.getDashboard(
      'monthly',
      undefined,
      new Date('2026-10-20T15:00:00Z'),
    );
    expect(r.series).toHaveLength(31);
    expect(r.series[30].previousSales).toBeNull();
    expect(r.series[29].previousSales).toBe(0);
  });

  it('marca como futuras las casillas que aún no llegan', async () => {
    const svc = make([]);
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.series.every((b) => !b.future)).toBe(true); // hoy es el 30
    const early = await svc.getDashboard(
      'monthly',
      undefined,
      new Date('2026-09-05T15:00:00Z'),
    );
    expect(early.series[4].future).toBe(false);
    expect(early.series[5].future).toBe(true);
  });

  it('una venta a las 10 pm de Colombia (ya es el día siguiente en UTC) va a su día', async () => {
    // 30 sep 22:30 en Colombia = 1 oct 03:30 UTC: sigue siendo septiembre.
    const svc = make([row(1, 100, '2026-10-01T03:30:00Z', 'FV')]);
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.current.sales).toBe(100);
    expect(r.series[29].sales).toBe(100);
  });
});

describe('DashboardService.getDashboard (otros períodos)', () => {
  it('diario: 24 casillas, una por hora de Colombia', async () => {
    const svc = make([row(1, 100, '2026-09-30T22:15:00Z', 'FV')]); // 5:15 pm
    const r = await svc.getDashboard('daily', undefined, NOW);
    expect(r.series).toHaveLength(24);
    expect(r.series[17].sales).toBe(100);
  });

  it('semanal: 7 casillas de lunes a domingo', async () => {
    const svc = make([row(1, 100, '2026-09-30T22:00:00Z', 'FV')]); // miércoles
    const r = await svc.getDashboard('weekly', undefined, NOW);
    expect(r.series).toHaveLength(7);
    expect(r.series[2].sales).toBe(100);
    expect(r.series[3].future).toBe(true);
  });

  it('anual: 12 casillas, una por mes', async () => {
    const svc = make([row(1, 100, '2026-03-15T15:00:00Z', 'FV')]);
    const r = await svc.getDashboard('yearly', undefined, NOW);
    expect(r.series).toHaveLength(12);
    expect(r.series[2].sales).toBe(100);
    expect(r.series[9].future).toBe(true); // octubre aún no llega
  });
});

describe('DashboardService.getDashboard (desgloses)', () => {
  const sale = (id: number, total: number, payCode: string, payName: string) => ({
    ...row(id, total, '2026-09-10T15:00:00Z', 'FVE'),
    payCode,
    payName: { es: payName },
  });
  const line = (
    detailId: number,
    subtotal: number,
    amount: number,
    name: string,
    category: string,
  ): DetailRow => ({
    detailId,
    subtotal: String(subtotal),
    amount: String(amount),
    name,
    category,
  });

  it('por forma de pago: suma exactamente las ventas, de mayor a menor', async () => {
    const svc = make([
      sale(1, 300, 'EFE', 'EFECTIVO'),
      sale(2, 900, 'TRAS', 'TRANSFERENCIA'),
      sale(3, 100, 'EFE', 'EFECTIVO'),
    ]);
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.byPayType.map((p) => [p.key, p.total, p.count])).toEqual([
      ['TRAS', 900, 1],
      ['EFE', 400, 2],
    ]);
    expect(r.byPayType.reduce((s, p) => s + p.total, 0)).toBe(r.current.sales);
  });

  it('por forma de pago: una factura anulada no cuenta como venta de esa forma', async () => {
    const svc = make(
      [sale(1, 500, 'EFE', 'EFECTIVO'), sale(2, 200, 'TRAS', 'TRANSFERENCIA')],
      { credit: [{ invoiceId: 1, total: '500' }] },
    );
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.byPayType).toHaveLength(1);
    expect(r.byPayType[0].key).toBe('TRAS');
  });

  it('por categoría: suma el valor de cada línea', async () => {
    const svc = make([sale(1, 700, 'EFE', 'EFECTIVO')], {}, [
      line(10, 500, 1, 'CABAÑA 2', 'HOSPEDAJE'),
      line(11, 200, 4, 'CERVEZA', 'BAR'),
    ]);
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.byCategory.map((c) => [c.key, c.total])).toEqual([
      ['HOSPEDAJE', 500],
      ['BAR', 200],
    ]);
  });

  it('por categoría: resta lo acreditado por notas crédito (parcial)', async () => {
    const svc = make(
      [sale(1, 800, 'EFE', 'EFECTIVO')],
      {
        credit: [
          {
            invoiceId: 1,
            total: '100',
            // se devolvió 1 de las 4 cervezas
            itemsSnapshot: [{ invoiceDetailId: 11, quantity: 1 }],
          } as any,
        ],
      },
      [line(10, 600, 1, 'CABAÑA 2', 'HOSPEDAJE'), line(11, 200, 4, 'CERVEZA', 'BAR')],
    );
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.byCategory.find((c) => c.key === 'BAR')?.total).toBe(150); // 200 × 3/4
  });

  it('por categoría: una línea totalmente acreditada desaparece', async () => {
    const svc = make(
      [sale(1, 800, 'EFE', 'EFECTIVO')],
      {
        credit: [
          {
            invoiceId: 1,
            total: '600',
            itemsSnapshot: [{ invoiceDetailId: 10, quantity: 1 }],
          } as any,
        ],
      },
      [line(10, 600, 1, 'CABAÑA 2', 'HOSPEDAJE'), line(11, 200, 4, 'CERVEZA', 'BAR')],
    );
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.byCategory.map((c) => c.key)).toEqual(['BAR']);
  });

  it('las notas débito vigentes van en su propia barra; las neutralizadas no', async () => {
    const svc = make(
      [sale(1, 1000, 'EFE', 'EFECTIVO')],
      {
        debit: [
          { invoiceId: 1, total: '120', debitNoteId: 7 },
          { invoiceId: 1, total: '30', debitNoteId: 8 },
        ],
        credit: [
          { invoiceId: 1, total: '120', neutralizedDebitNoteIds: [7] } as any,
        ],
      },
      [line(10, 1000, 1, 'CABAÑA 2', 'HOSPEDAJE')],
    );
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.byCategory.find((c) => c.key === 'DEBIT_NOTES')?.total).toBe(30);
  });

  it('los más vendidos: se ordenan por valor y se limitan a 5', async () => {
    const lines = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((n, i) =>
      line(100 + i, (i + 1) * 100, 1, `PRODUCTO ${n}`, 'BAR'),
    );
    const svc = make([sale(1, 2800, 'EFE', 'EFECTIVO')], {}, lines);
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.top).toHaveLength(5);
    expect(r.top[0].name).toBe('PRODUCTO G');
    expect(r.top[4].name).toBe('PRODUCTO C');
  });

  it('el mismo producto en dos facturas se junta', async () => {
    const svc = make(
      [sale(1, 200, 'EFE', 'EFECTIVO'), sale(2, 300, 'EFE', 'EFECTIVO')],
      {},
      [line(10, 200, 2, 'CERVEZA', 'BAR'), line(20, 300, 3, 'CERVEZA', 'BAR')],
    );
    const r = await svc.getDashboard('monthly', undefined, NOW);
    expect(r.top).toEqual([
      { name: 'CERVEZA', category: 'BAR', quantity: 5, total: 500 },
    ]);
  });

  it('sin ventas en el período no hay desgloses', async () => {
    const r = await make([]).getDashboard('monthly', undefined, NOW);
    expect(r.byCategory).toEqual([]);
    expect(r.byPayType).toEqual([]);
    expect(r.top).toEqual([]);
  });

  it('rango libre: serie por día y período anterior de la misma duración', async () => {
    const svc = make([
      row(1, 100, '2026-09-12T15:00:00Z', 'FV'),
      row(2, 40, '2026-09-02T15:00:00Z', 'FV'),
    ]);
    const r = await svc.getDashboard('custom', undefined, NOW, {
      from: '2026-09-10',
      to: '2026-09-19',
    });
    expect(r.series).toHaveLength(10);
    expect(r.series[2].sales).toBe(100);
    expect(r.previous.sales).toBe(40); // 31 ago – 9 sep
  });
});
