/**
 * Lectura de los errores que devuelve Factus, compartida por los cinco
 * documentos: factura, nota crédito, nota débito, documento soporte y nota de
 * ajuste.
 *
 * Había una copia por servicio y ninguna leía bien la respuesta real de la API.
 * Son dos problemas distintos, los dos aprendidos rompiendo producción.
 *
 * **1 · Dónde viven los errores de validación.** Un 422 de Factus llega así:
 *
 * ```json
 * {"status":"Validation error",
 *  "message":"El documento contiene errores de validación",
 *  "data":{"errors":["Regla: 90, Rechazo: Documento procesado anteriormente."]}}
 * ```
 *
 * El array está en `data.errors`, **no** en la raíz. Leyendo `errors` a secas
 * siempre salía vacío y al usuario solo le llegaba el `message` genérico: el
 * motivo real de la DIAN se perdía y quedaba únicamente en el log del cliente
 * HTTP. Es lo que dejó una sesión entera de pruebas delante del cliente sin
 * saber por qué fallaba.
 *
 * **2 · Qué forma tiene `errors`.** Cambia según el endpoint: array de strings
 * al validar, objeto indexado por regla (`{"90": "Regla: 90, …"}`) al listar, y
 * objeto de validación estilo Laravel (`{campo: [msgs]}`) cuando lo que falla
 * es el payload. Asumir una sola forma no solo perdía mensajes:
 * `Object.entries(array)` seguido de `msgs.map(...)` revienta con un TypeError
 * sobre un string y convertía un 422 legible en un 500 opaco.
 */

/**
 * Qué dice la DIAN de un documento que volvió con `is_validated: false`.
 *
 * Son tres situaciones con tres respuestas OPUESTAS, y tratarlas como una sola
 * es lo que alargó el incidente A773:
 *
 * - `rejected` — la DIAN rechazó el CONTENIDO. Hay que eliminar el documento en
 *   Factus, corregir los datos y reenviar con el MISMO `reference_code`. Si no
 *   se elimina, bloquea los envíos siguientes con 409.
 * - `already-processed` — Regla 90. La DIAN **ya tiene** el documento: el envío
 *   llegó y lo que se perdió fue la respuesta. **Ni borrar ni reenviar.**
 *   Borrarlo en Factus no lo borra en la DIAN, solo destruye el único vínculo
 *   con un documento que existe legalmente; y reenviar regenera el mismo
 *   consecutivo y el mismo CUDE, así que repite la Regla 90 indefinidamente. Se
 *   destraba pidiéndole a soporte de Factus que reconcilie el estado contra la
 *   DIAN (GetStatus con el CUDE).
 * - `pending` — la DIAN solo está demorada. No eliminar nada; reintentar más
 *   tarde con los mismos datos y Factus reconcilia solo.
 */
export type FactusDianOutcome = 'rejected' | 'already-processed' | 'pending';

/**
 * Regla 90 de la DIAN: "Documento procesado anteriormente".
 *
 * Se comprueba ANTES que el rechazo genérico porque su texto también contiene
 * la palabra "Rechazo" (`"Regla: 90, Rechazo: Documento procesado
 * anteriormente."`). Un `/rechazo/i` a secas la clasificaba como rechazo de
 * contenido y le decía al usuario que borrara y reenviara — exactamente las dos
 * cosas que no hay que hacer aquí.
 */
const ALREADY_PROCESSED_RE = /procesado\s+anteriormente|regla:?\s*90\b/i;

const REJECTED_RE = /rechazo/i;

/**
 * Clasifica los `errors` de la DIAN.
 *
 * Ojo: no todo lo que aparece en `errors` invalida el documento. Reglas como
 * `FAJ43b`, `FAJ44b` o `RUT01` son notificaciones informativas (el nombre no
 * calza letra por letra con el RUT, típicamente) y el documento es válido. Solo
 * cuenta como rechazo si el texto dice "Rechazo".
 */
export const classifyDianErrors = (errors: string[]): FactusDianOutcome => {
  if (errors.some((e) => ALREADY_PROCESSED_RE.test(e))) {
    return 'already-processed';
  }
  if (errors.some((e) => REJECTED_RE.test(e))) return 'rejected';
  return 'pending';
};

/** Aplana cualquiera de las formas de `errors` a una lista de textos. */
const flattenErrors = (errors: unknown): string[] => {
  if (errors == null) return [];
  if (Array.isArray(errors)) return errors.map((e) => String(e));
  if (typeof errors === 'object') {
    // Puede ser `{"90": "Regla: 90, …"}` (indexado por regla) o
    // `{campo: ["msg1", "msg2"]}` (validación de payload). El campo solo se
    // antepone cuando aporta algo: en el indexado por regla es un número y el
    // texto ya trae "Regla: 90" dentro.
    return Object.entries(errors as Record<string, unknown>).flatMap(
      ([field, value]) => {
        const messages = Array.isArray(value)
          ? value.map((v) => String(v))
          : [String(value)];
        const useField = !/^\d+$/.test(field);
        return messages.map((m) => (useField ? `${field}: ${m}` : m));
      },
    );
  }
  return [String(errors)];
};

/**
 * Errores de un documento devuelto por Factus (respuesta 2xx con
 * `is_validated: false`). `docKeys` son los nombres bajo los que cada endpoint
 * anida el documento: `bill`, `credit_note`, `debit_note`…
 */
export const extractDocumentErrors = (
  raw: unknown,
  ...docKeys: string[]
): string[] => {
  const data = (raw as any)?.data ?? raw;
  const doc =
    docKeys.map((k) => data?.[k]).find((d) => d != null) ?? data ?? raw;
  return flattenErrors((doc as any)?.errors);
};

/**
 * Errores de una respuesta de ERROR HTTP (422). `responseData` es el cuerpo
 * completo tal cual lo entrega `FactusApiError.responseData`.
 *
 * Mira `data.errors` primero —que es donde Factus los pone de verdad— y cae a
 * `errors` en la raíz por si algún endpoint usa la forma antigua. Si no hay
 * nada estructurado, devuelve el `message` más específico disponible en vez de
 * una lista vacía: un mensaje genérico sigue siendo mejor que ninguno.
 */
export const parseFactusValidationErrors = (
  responseData: unknown,
): string[] => {
  const body = responseData as any;

  const fromData = flattenErrors(body?.data?.errors);
  if (fromData.length) return fromData;

  const fromRoot = flattenErrors(body?.errors);
  if (fromRoot.length) return fromRoot;

  const message = body?.data?.message ?? body?.message;
  return message ? [String(message)] : [];
};
