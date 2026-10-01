import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import {
  isPurchaseTypeCode,
  isSaleTypeCode,
} from './../../shared/constants/invoiceType.constants';
import {
  getNoteTotalsByInvoice,
  netPurchaseTotal,
  netSaleTotal,
} from './../../shared/utils/invoice-notes.utils';
import { CreditNote } from './../../shared/entities/creditNote.entity';
import { DebitNote } from './../../shared/entities/debitNote.entity';
import { InvoiceDetaill } from './../../shared/entities/invoiceDetaill.entity';
import {
  DashboardBreakdownItem,
  DashboardBucket,
  DashboardResponse,
  DashboardTopItem,
  DashboardTotals,
} from '../dtos/dashboard.dto';
import {
  bucketCount,
  bucketIndex,
  bucketStart,
  CustomRange,
  DashboardPeriod,
  periodRange,
} from '../utils/period-range.utils';

const emptyTotals = (): DashboardTotals => ({
  sales: 0,
  purchases: 0,
  result: 0,
  salesCount: 0,
  purchasesCount: 0,
});

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Cuántos productos/servicios se listan en "los más vendidos". */
const TOP_LIMIT = 5;

/** Clave de la barra de "cobros por nota débito" en el desglose por categoría. */
export const DEBIT_NOTES_KEY = 'DEBIT_NOTES';

/**
 * Tablero de ganancias: cifras del período, comparación con el anterior, serie
 * en el tiempo y desgloses, TODO calculado aquí (el cliente solo dibuja).
 *
 * Usa el mismo neteo de notas que el balance y los reportes
 * (`shared/utils/invoice-notes.utils`), para que las cifras cuadren con lo que
 * ya se muestra. Las cotizaciones no cuentan: no son un documento fiscal.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly _invoiceRepository: InvoiceRepository) {}

  async getDashboard(
    period: DashboardPeriod,
    organizationalId?: string,
    now: Date = new Date(),
    custom?: CustomRange,
  ): Promise<DashboardResponse> {
    const current = periodRange(period, now, 0, custom);
    const previous = periodRange(period, now, 1, custom);

    // Una sola lectura de las dos ventanas contiguas (anterior + actual).
    const query = this._invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.invoiceType', 'invoiceType')
      .leftJoin('invoice.payType', 'payType')
      .where('invoice.createdAt >= :from AND invoice.createdAt < :to', {
        from: previous.start.toISOString(),
        to: current.end.toISOString(),
      })
      .andWhere('invoice.deletedAt IS NULL')
      .andWhere('invoiceType.deletedAt IS NULL');
    if (organizationalId) {
      query.andWhere('invoice.organizationalId = :organizationalId', {
        organizationalId,
      });
    } else {
      query.andWhere('invoice.organizationalId IS NULL');
    }
    const rows = await query
      .select([
        'invoice.invoiceId AS "invoiceId"',
        'invoice.total AS total',
        'invoice.createdAt AS "createdAt"',
        'invoiceType.code AS "typeCode"',
        'payType.code AS "payCode"',
        'payType.name AS "payName"',
      ])
      .getRawMany<{
        invoiceId: number;
        total: string;
        createdAt: Date;
        typeCode: string;
        payCode: string | null;
        payName: Record<string, string> | null;
      }>();

    const noteTotals = await getNoteTotalsByInvoice(
      this._invoiceRepository.manager,
      rows.map((r) => Number(r.invoiceId)).filter((id) => id > 0),
    );

    const size = bucketCount(period, current);
    const prevSize = bucketCount(period, previous);
    const sales = new Array<number>(size).fill(0);
    const purchases = new Array<number>(size).fill(0);
    const prevSales = new Array<number>(prevSize).fill(0);
    const prevPurchases = new Array<number>(prevSize).fill(0);
    const totalsNow = emptyTotals();
    const totalsPrev = emptyTotals();

    // Para los desgloses: solo las ventas del período ACTUAL.
    const currentSaleIds: number[] = [];
    const payTypes = new Map<string, DashboardBreakdownItem>();

    for (const row of rows) {
      const isSale = isSaleTypeCode(row.typeCode);
      const isPurchase = isPurchaseTypeCode(row.typeCode);
      if (!isSale && !isPurchase) continue; // cotizaciones y demás

      const at = new Date(row.createdAt);
      const id = Number(row.invoiceId);
      const gross = Number(row.total);
      const net = isSale
        ? netSaleTotal(gross, id, noteTotals)
        : netPurchaseTotal(gross, id, noteTotals);

      const nowIdx = bucketIndex(period, current, at);
      const prevIdx = nowIdx >= 0 ? -1 : bucketIndex(period, previous, at);
      const target = nowIdx >= 0 ? totalsNow : prevIdx >= 0 ? totalsPrev : null;
      if (!target) continue;

      if (isSale) {
        target.sales += net;
        if (net > 0) target.salesCount += 1;
        if (nowIdx >= 0) {
          sales[nowIdx] += net;
          currentSaleIds.push(id);
          const key = row.payCode ?? 'NA';
          const entry = payTypes.get(key) ?? {
            key,
            name: row.payName?.['es'] ?? key,
            total: 0,
            count: 0,
          };
          entry.total += net;
          if (net > 0) entry.count = (entry.count ?? 0) + 1;
          payTypes.set(key, entry);
        } else {
          prevSales[prevIdx] += net;
        }
      } else {
        target.purchases += net;
        if (net > 0) target.purchasesCount += 1;
        if (nowIdx >= 0) purchases[nowIdx] += net;
        else prevPurchases[prevIdx] += net;
      }
    }

    for (const t of [totalsNow, totalsPrev]) {
      t.sales = round2(t.sales);
      t.purchases = round2(t.purchases);
      t.result = round2(t.sales - t.purchases);
    }

    const series: DashboardBucket[] = [];
    for (let i = 0; i < size; i++) {
      const start = bucketStart(period, current, i);
      series.push({
        start: start.toISOString(),
        sales: round2(sales[i]),
        purchases: round2(purchases[i]),
        previousSales: i < prevSize ? round2(prevSales[i]) : null,
        previousPurchases: i < prevSize ? round2(prevPurchases[i]) : null,
        future: start > now,
      });
    }

    const { byCategory, top } = await this.salesBreakdown(currentSaleIds);

    return {
      period,
      range: {
        start: current.start.toISOString(),
        end: current.end.toISOString(),
      },
      previousRange: {
        start: previous.start.toISOString(),
        end: previous.end.toISOString(),
      },
      current: totalsNow,
      previous: totalsPrev,
      series,
      byCategory,
      byPayType: [...payTypes.values()]
        .map((p) => ({ ...p, total: round2(p.total) }))
        .filter((p) => p.total > 0)
        .sort((a, b) => b.total - a.total),
      top,
      generatedAt: now.toISOString(),
    };
  }

  /**
   * Ventas por categoría y los más vendidos, de las facturas de venta dadas.
   *
   * Parte del valor de cada LÍNEA (`subtotal`, que ya incluye el impuesto: las
   * líneas suman el total de la factura) y le quita lo acreditado por notas
   * crédito, que guardan la selección de líneas y cantidades. Las notas débito
   * son conceptos libres que no pertenecen a ninguna línea, así que van en su
   * propia barra —descontando las que una nota crédito ya neutralizó— y el
   * desglose suma lo mismo que las ventas.
   */
  private async salesBreakdown(invoiceIds: number[]): Promise<{
    byCategory: DashboardBreakdownItem[];
    top: DashboardTopItem[];
  }> {
    if (!invoiceIds.length) return { byCategory: [], top: [] };
    const manager = this._invoiceRepository.manager;

    const [details, creditNotes, debitNotes] = await Promise.all([
      manager
        .getRepository(InvoiceDetaill)
        .createQueryBuilder('detail')
        .innerJoin('detail.invoice', 'invoice')
        .leftJoin('detail.product', 'product')
        // Alias en minúsculas a propósito: en `select` crudo Postgres baja a
        // minúsculas los identificadores sin comillas y `productCategory.name`
        // fallaba con "missing FROM-clause entry".
        .leftJoin('product.categoryType', 'pcat')
        .leftJoin('detail.accommodation', 'accommodation')
        .leftJoin('accommodation.categoryType', 'acat')
        .leftJoin('detail.excursion', 'excursion')
        .leftJoin('excursion.categoryType', 'ecat')
        .where('invoice.invoiceId IN (:...ids)', { ids: invoiceIds })
        .andWhere('detail.deletedAt IS NULL')
        .select([
          'detail.invoiceDetailId AS "detailId"',
          'detail.subtotal AS subtotal',
          'detail.amount AS amount',
          `COALESCE(product.name->>'es', accommodation.name->>'es', excursion.name->>'es') AS name`,
          `COALESCE(pcat.name->>'es', acat.name->>'es', ecat.name->>'es') AS category`,
        ])
        .getRawMany<{
          detailId: number;
          subtotal: string;
          amount: string;
          name: string | null;
          category: string | null;
        }>(),
      manager.find(CreditNote, { where: { invoiceId: In(invoiceIds) } }),
      manager.find(DebitNote, { where: { invoiceId: In(invoiceIds) } }),
    ]);

    // Cantidad ya acreditada por línea.
    const credited = new Map<number, number>();
    for (const note of creditNotes) {
      const selection = Array.isArray(note.itemsSnapshot)
        ? (note.itemsSnapshot as { invoiceDetailId: number; quantity: number }[])
        : [];
      for (const s of selection) {
        credited.set(
          s.invoiceDetailId,
          (credited.get(s.invoiceDetailId) ?? 0) + Number(s.quantity ?? 0),
        );
      }
    }

    const categories = new Map<string, number>();
    const items = new Map<string, DashboardTopItem>();
    for (const d of details) {
      const amount = Number(d.amount) || 0;
      const subtotal = Number(d.subtotal) || 0;
      const remaining = Math.max(amount - (credited.get(d.detailId) ?? 0), 0);
      const value = amount > 0 ? (subtotal * remaining) / amount : 0;
      if (value <= 0) continue;

      const category = d.category ?? 'OTROS';
      categories.set(category, (categories.get(category) ?? 0) + value);

      const name = d.name ?? '—';
      const item = items.get(`${category}|${name}`) ?? {
        name,
        category,
        quantity: 0,
        total: 0,
      };
      item.quantity += remaining;
      item.total += value;
      items.set(`${category}|${name}`, item);
    }

    // Notas débito vigentes: las que ninguna nota crédito neutralizó.
    const neutralized = new Set(
      creditNotes.flatMap((c) => c.neutralizedDebitNoteIds ?? []),
    );
    const debit = debitNotes
      .filter((d) => !neutralized.has(d.debitNoteId))
      .reduce((sum, d) => sum + Number(d.total ?? 0), 0);
    if (debit > 0) categories.set(DEBIT_NOTES_KEY, debit);

    return {
      byCategory: [...categories.entries()]
        .map(([key, total]) => ({ key, name: key, total: round2(total) }))
        .sort((a, b) => b.total - a.total),
      top: [...items.values()]
        .map((i) => ({
          ...i,
          quantity: round2(i.quantity),
          total: round2(i.total),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, TOP_LIMIT),
    };
  }
}
