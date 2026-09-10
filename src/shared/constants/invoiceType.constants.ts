/**
 * Códigos de `InvoiceType` agrupados por naturaleza económica.
 *
 * Al emitir un documento electrónico la factura CAMBIA de tipo: una venta pasa
 * de `FV` a `FVE` y una compra pasa de `FC` a `DSE` (documento soporte). Todo
 * filtro escrito contra el tipo de papel deja de contar el documento en cuanto
 * se emite, y esa regresión ya se coló dos veces — tras el split de junio de
 * 2026, balance y reportes dejaron de sumar las ventas electrónicas porque
 * seguían preguntando solo por `FV`.
 *
 * Filtrar SIEMPRE por estos grupos, nunca por el literal suelto.
 */
export const SALE_TYPE_CODES = ['FV', 'FVE'] as const;
export const PURCHASE_TYPE_CODES = ['FC', 'DSE'] as const;

export const isSaleTypeCode = (code?: string | null): boolean =>
  !!code && (SALE_TYPE_CODES as readonly string[]).includes(code);

export const isPurchaseTypeCode = (code?: string | null): boolean =>
  !!code && (PURCHASE_TYPE_CODES as readonly string[]).includes(code);

/**
 * Devuelve la lista lista para interpolar en un `IN (...)` de SQL crudo, para
 * los `CASE WHEN` de las estadísticas. Los valores son constantes del código
 * —nunca entrada del usuario—, así que la interpolación es segura.
 */
export const sqlCodeList = (codes: readonly string[]): string =>
  codes.map((code) => `'${code}'`).join(', ');

/** `IN ('FV', 'FVE')` — ventas, en papel y electrónicas. */
export const SALE_CODES_SQL = sqlCodeList(SALE_TYPE_CODES);

/** `IN ('FC', 'DSE')` — compras, en papel y con documento soporte. */
export const PURCHASE_CODES_SQL = sqlCodeList(PURCHASE_TYPE_CODES);
