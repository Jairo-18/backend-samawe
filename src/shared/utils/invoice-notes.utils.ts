import { EntityManager, In } from 'typeorm';
import { CreditNote } from '../entities/creditNote.entity';
import { DebitNote } from '../entities/debitNote.entity';
import { AdjustmentNote } from '../entities/adjustmentNote.entity';

/**
 * Neteo de facturas por sus notas DIAN, compartido por balance, ganancias,
 * reportes y estadísticas.
 *
 * Cada uno de esos sitios netaba **solo la nota crédito**, que era lo único que
 * existía cuando se escribieron. Desde el 12 sep 2026 hay tres notas y dos de
 * ellas quedaban fuera de todos los totales:
 *
 * | Nota | Cuelga de | Efecto |
 * |---|---|---|
 * | Crédito (NC) | factura de venta (FVE) | **resta** a ventas |
 * | Débito (ND)  | factura de venta (FVE) | **suma** a ventas |
 * | Ajuste (NA)  | documento soporte (DSE) | **resta** a compras |
 *
 * La nota de ajuste es la que más se nota hoy: hay tres emitidas en producción
 * (NA1, NA2, NA3) y ninguna descontaba de las compras, así que `totalInvoiceBuy`
 * venía inflado por mercancía ya declarada como no comprada.
 *
 * ⚠️ **La nota débito no se puede netear por línea.** Sus ítems son conceptos
 * libres —intereses, gastos de cobranza— que no existen como líneas de la
 * factura, así que solo tiene `total`. Donde el cálculo va por línea (ventas por
 * categoría) no se puede repartir; ahí se documenta y se deja fuera del desglose
 * en vez de imputarla a una categoría inventada.
 */

/** Totales de notas agrupados por `invoiceId`, con el signo ya decidido. */
export interface InvoiceNoteTotals {
  /** Notas crédito: **resta** al total de la factura de venta. */
  credited: Map<number, number>;
  /** Notas débito: **suma** al total de la factura de venta. */
  debited: Map<number, number>;
  /** Notas de ajuste: **resta** al total del documento soporte (compra). */
  adjusted: Map<number, number>;
}

const emptyTotals = (): InvoiceNoteTotals => ({
  credited: new Map(),
  debited: new Map(),
  adjusted: new Map(),
});

const sumByInvoice = (
  target: Map<number, number>,
  notes: { invoiceId: number; total: unknown }[],
): void => {
  for (const n of notes) {
    target.set(n.invoiceId, (target.get(n.invoiceId) ?? 0) + (Number(n.total) || 0));
  }
};

/**
 * Total de cada tipo de nota por factura, para el conjunto de facturas dado.
 *
 * Una sola lectura por tipo. Devuelve mapas vacíos si no hay facturas, para que
 * quien llama no tenga que hacer el `if` cada vez.
 */
export const getNoteTotalsByInvoice = async (
  manager: EntityManager,
  invoiceIds: number[],
): Promise<InvoiceNoteTotals> => {
  const totals = emptyTotals();
  if (!invoiceIds.length) return totals;

  const where = { invoiceId: In(invoiceIds) };
  const [creditNotes, debitNotes, adjustmentNotes] = await Promise.all([
    manager.find(CreditNote, { where }),
    manager.find(DebitNote, { where }),
    manager.find(AdjustmentNote, { where }),
  ]);

  sumByInvoice(totals.credited, creditNotes);
  sumByInvoice(totals.debited, debitNotes);
  sumByInvoice(totals.adjusted, adjustmentNotes);

  return totals;
};

/**
 * Lo restado nunca puede pasarse del bruto del documento.
 *
 * No es defensa teórica: el total de una nota se calcula con el redondeo por
 * línea de Factus y el de la factura no, así que una anulación total puede
 * quedar unos centavos POR ENCIMA del documento que anula. En producción, la
 * `NA2` es de $155.630,18 sobre una compra de $155.630,08. Sin este tope la
 * compra neta quedaría en −0,10 y el balance arrastraría negativos absurdos.
 *
 * Los servicios ya impiden sobre-acreditar por CANTIDAD (el tope de
 * "restante"), así que lo único que puede sobrar aquí son esos centavos.
 */
const clampToGross = (gross: number, subtracted: number): number =>
  Math.min(subtracted, Math.max(gross, 0));

/** Venta neta de una factura: bruto − notas crédito + notas débito. */
export const netSaleTotal = (
  gross: number,
  invoiceId: number,
  totals: InvoiceNoteTotals,
): number =>
  gross -
  clampToGross(gross, totals.credited.get(invoiceId) ?? 0) +
  (totals.debited.get(invoiceId) ?? 0);

/** Compra neta de un documento soporte: bruto − notas de ajuste. */
export const netPurchaseTotal = (
  gross: number,
  invoiceId: number,
  totals: InvoiceNoteTotals,
): number =>
  gross - clampToGross(gross, totals.adjusted.get(invoiceId) ?? 0);
