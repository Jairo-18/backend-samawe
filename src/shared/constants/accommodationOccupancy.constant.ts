/**
 * Estados de pago de una factura que dejan el hospedaje OCUPADO en sus fechas.
 *
 * Los códigos están verificados contra las dos bases de datos (prod y dev,
 * consultadas el 3 sep 2026) y coinciden:
 *   PEN  = PENDIENTE          PAG  = PAGADO         NA = NO APLICA
 *   RES  = RESERVADO - PENDIENTE
 *   RES2 = RESERVADO - PAGADO
 *
 * ⚠️ `RES` aquí es un `PaidType`, NO el `CategoryType` 'RES' de RESTAURANTE que
 * usa `RECIPE_CATEGORY_CODES`. Son tablas distintas y el mismo string significa
 * cosas distintas: no unificar ni reutilizar la constante.
 *
 * Se compara por `code` y no por el nombre en español, que era lo que había
 * antes: el catálogo se edita desde el CRUD del panel, y un renombrado apagaba
 * la comprobación de doble reserva en silencio. Además había cuatro variantes
 * de escritura hardcodeadas y cualquier otra se escapaba.
 *
 * Si algún día se añade otro estado que deba bloquear, se agrega su código aquí
 * — es el único sitio.
 */
export const RESERVED_PAID_TYPE_CODES = ['res', 'res2'];

/**
 * Condición SQL reutilizable. Espera que el alias `paidType` esté unido a la
 * consulta (o que exista con ese nombre dentro de la subconsulta).
 */
export const RESERVED_PAID_TYPE_CONDITION = `LOWER(TRIM("paidType"."code")) IN (:...reservedCodes)`;

export const RESERVED_PAID_TYPE_PARAMS = {
  reservedCodes: RESERVED_PAID_TYPE_CODES,
};
