/**
 * Construcción del `reference_code` de las notas (crédito, débito y de ajuste).
 *
 * **Factus deduplica por `reference_code`, y reenviar el MISMO código es el
 * reintento oficial**: devuelve el documento existente y vuelve a consultar su
 * estado en la DIAN. Un código nuevo en cada intento hace lo contrario — crea un
 * documento suelto más — y no destraba nada, porque el documento atascado sigue
 * ahí bloqueando los envíos con 409. Fue la causa del incidente A773 y volvió a
 * pasar el 12 de septiembre con la primera nota crédito y la primera nota
 * débito de producción, que llevaban `Date.now()` en la referencia.
 *
 * La factura lo tiene fácil: su referencia es `invoice.code` y no hay más que
 * decidir. Las notas **no**, porque una misma factura admite varias (parciales
 * sucesivas), así que `NC-${invoice.code}` a secas haría que la segunda nota
 * chocara con la primera y Factus devolviera la primera en vez de emitirla.
 *
 * La salida es un secuencial sobre las notas **ya persistidas**, que son las
 * que la DIAN validó:
 *
 * - Reintentar una nota atascada → no incrementó el contador → misma referencia
 *   → reintento oficial de Factus, que es justo lo que se quiere.
 * - Emitir una segunda nota distinta → la primera ya está persistida → la
 *   referencia avanza → documento nuevo, sin colisión.
 */

/** Prefijo por tipo de nota. Coincide con el del rango DIAN correspondiente. */
export type FactusNotePrefix = 'NC' | 'ND' | 'NA';

/**
 * `reference_code` determinista de una nota.
 *
 * @param prefix        NC (crédito), ND (débito) o NA (ajuste).
 * @param invoiceCode   Código interno de la factura o compra (`invoice.code`).
 * @param persistedCount Notas de ese tipo YA guardadas para ese documento.
 */
export const buildNoteReferenceCode = (
  prefix: FactusNotePrefix,
  invoiceCode: string,
  persistedCount: number,
): string => `${prefix}-${invoiceCode}-${persistedCount + 1}`;
