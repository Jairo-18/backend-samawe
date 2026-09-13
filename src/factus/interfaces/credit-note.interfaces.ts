/** Selección de un ítem a acreditar (devolución parcial). */
export interface CreditNoteItemSelection {
  invoiceDetailId: number;
  /** Cantidad a acreditar; si se omite, se usa la cantidad completa del ítem. */
  quantity?: number;
}

/** Opciones para generar una nota crédito sobre una factura interna. */
export interface CreateCreditNoteOptions {
  /**
   * Concepto de corrección DIAN. Si no se envía, se deriva: total → '2'
   * (anulación), parcial → '1' (devolución parcial).
   */
  correctionConceptCode?: string;
  /** true = anula la factura completa (todos los ítems). */
  isTotal?: boolean;
  /** Ítems a acreditar en una devolución parcial (si isTotal es false). */
  items?: CreditNoteItemSelection[];
  /**
   * SOLO para la recuperación (`/recover`): el `reference_code` real del
   * documento en Factus. Al emitir se ignora — ahí la referencia siempre se
   * calcula.
   *
   * Existe por las notas emitidas antes del 13 sep 2026, cuya referencia
   * llevaba un `Date.now()` que no quedó guardado en ninguna parte (la nota no
   * se persiste si la DIAN no la valida). La única forma de recuperarlas es
   * leer su `reference_code` del portal de Factus y pasarlo aquí.
   */
  referenceCode?: string;
  observation?: string;
}

/** Resultado normalizado de una nota crédito validada por Factus. */
export interface FactusCreditNoteResult {
  number: string | null;
  referenceCode: string | null;
  isValidated: boolean;
  cude: string | null;
  qrCode: string | null;
  publicUrl: string | null;
  total: string;
  createdAt: string;
}
