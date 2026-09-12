/** Selección de un ítem a ajustar del documento soporte. */
export interface AdjustmentNoteItemSelection {
  invoiceDetailId: number;
  /** Cantidad a ajustar; si se omite, la cantidad restante del ítem. */
  quantity?: number;
}

/** Opciones para generar una nota de ajuste sobre un documento soporte. */
export interface CreateAdjustmentNoteOptions {
  /**
   * Motivo DIAN: `1` devolución parcial · `2` anulación del documento soporte ·
   * `3` rebaja o descuento · `4` ajuste de precio · `5` otros.
   * Si no se envía, se deriva: total → `2`, parcial → `1`.
   */
  correctionConceptCode?: string;
  /** true = anula el documento soporte completo (todos los ítems). */
  isTotal?: boolean;
  /** Ítems a ajustar cuando no es total. */
  items?: AdjustmentNoteItemSelection[];
  observation?: string;
}

/** Resultado normalizado de una nota de ajuste validada por Factus. */
export interface FactusAdjustmentNoteResult {
  number: string | null;
  referenceCode: string | null;
  isValidated: boolean;
  /** CUDS, igual que el documento soporte del que cuelga (no CUFE ni CUDE). */
  cuds: string | null;
  qrCode: string | null;
  publicUrl: string | null;
  total: string;
  createdAt: string;
}
