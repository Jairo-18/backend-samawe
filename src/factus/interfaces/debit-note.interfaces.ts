/**
 * Una línea de cobro de la nota débito.
 *
 * ⚠️ A diferencia de la nota crédito, **no se seleccionan ítems de la factura**.
 * Una nota crédito devuelve algo que ya estaba facturado, así que referencia sus
 * líneas; una nota débito **cobra de más** por conceptos que no estaban en la
 * factura —intereses de mora, gastos de cobranza, un ajuste de valor—, y esos
 * conceptos no existen como líneas previas. Por eso aquí se describen a mano.
 */
export interface DebitNoteItemInput {
  /** Descripción del cobro, p. ej. "Intereses de mora agosto". */
  name: string;
  /** Cantidad; por defecto 1. */
  quantity?: number;
  /** Valor unitario SIN impuesto. */
  price: number;
  /** Porcentaje de impuesto ("19" = 19%). Por defecto 0 (sin impuesto). */
  taxRate?: number;
  /** Código de impuesto Factus: '01' IVA, '04' IPOCONSUMO. Por defecto '01'. */
  taxCode?: string;
  /** Referencia interna del cobro; se genera una si no se envía. */
  codeReference?: string;
}

/** Opciones para generar una nota débito sobre una factura electrónica. */
export interface CreateDebitNoteOptions {
  /**
   * Concepto DIAN de la nota débito:
   * `1` intereses · `2` gastos por cobrar · `3` cambio del valor · `4` otros.
   * Por defecto `1`. **No existe un concepto de anulación**: para anular una
   * factura la figura es la nota crédito.
   */
  correctionConceptCode?: string;
  /** Líneas a cobrar. Al menos una. */
  items: DebitNoteItemInput[];
  observation?: string;
}

/** Resultado normalizado de una nota débito validada por Factus. */
export interface FactusDebitNoteResult {
  number: string | null;
  referenceCode: string | null;
  isValidated: boolean;
  cude: string | null;
  qrCode: string | null;
  publicUrl: string | null;
  total: string;
  createdAt: string;
}
