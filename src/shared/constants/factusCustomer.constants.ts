/**
 * Clasificación del cliente/proveedor ante la DIAN, tal como la pide Factus en
 * el objeto `customer` (y en el `provider` del documento soporte).
 *
 * ⚠️ Son DOS EJES INDEPENDIENTES, y confundirlos fue el bug original:
 *
 *  - `legal_organization_code` → persona **jurídica** o **natural**.
 *  - `tribute_code`            → si es **responsable de IVA** o no.
 *
 * Una persona natural puede perfectamente ser responsable de IVA (un
 * independiente que supera el umbral UVT) y una jurídica puede no serlo. Antes
 * el sistema derivaba lo primero del tipo de documento —asumiendo "NIT = empresa"—
 * y lo segundo ni existía: todo cliente se facturaba con `tribute_code: 'ZZ'`.
 *
 * En Colombia una persona natural no obligada a facturar TAMBIÉN tiene NIT
 * (normalmente su propia cédula inscrita en el RUT), así que el tipo de
 * documento no basta para decidir. Por eso `User.factusLegalOrganizationCode`
 * es la fuente de verdad y el tipo de documento solo aporta el valor por
 * defecto que se sugiere al crear.
 */

/** `legal_organization_code` de Factus. */
export const FACTUS_LEGAL_ORGANIZATION_JURIDICA = '1';
export const FACTUS_LEGAL_ORGANIZATION_NATURAL = '2';

export const FACTUS_LEGAL_ORGANIZATION_CODES = [
  FACTUS_LEGAL_ORGANIZATION_JURIDICA,
  FACTUS_LEGAL_ORGANIZATION_NATURAL,
] as const;

/**
 * `tribute_code` (clasificación tributaria del adquiriente). Catálogo DIAN que
 * expone Factus en sus tablas de referencia.
 */
export const FACTUS_TRIBUTE_IVA = '01';
export const FACTUS_TRIBUTE_INC = '04';
export const FACTUS_TRIBUTE_IVA_E_INC = 'ZA';
/** Por defecto: "No aplica". Es lo correcto para un consumidor final. */
export const FACTUS_TRIBUTE_NO_APLICA = 'ZZ';

export const FACTUS_TRIBUTE_CODES = [
  FACTUS_TRIBUTE_IVA,
  FACTUS_TRIBUTE_INC,
  FACTUS_TRIBUTE_IVA_E_INC,
  FACTUS_TRIBUTE_NO_APLICA,
] as const;

/** `identification_document_code` del NIT. */
export const NIT_FACTUS_CODE = '31';

/**
 * `PersonType.code` equivalente a cada organización legal. Se resuelve por
 * `code` y nunca por id: los `personTypeId` los asigna un SERIAL y difieren
 * entre bases (misma trampa que ya mordió con `InvoiceType`).
 */
export const PERSON_TYPE_CODE_JURIDICA = 'JUR';
export const PERSON_TYPE_CODE_NATURAL = 'NAT';

export function personTypeCodeFor(legalOrganizationCode: string): string {
  return legalOrganizationCode === FACTUS_LEGAL_ORGANIZATION_JURIDICA
    ? PERSON_TYPE_CODE_JURIDICA
    : PERSON_TYPE_CODE_NATURAL;
}

/**
 * Valor SUGERIDO de `legal_organization_code` a partir del tipo de documento.
 * Es solo el default al crear un usuario que no especifica nada: quien manda es
 * la columna `User.factusLegalOrganizationCode`.
 */
export function defaultLegalOrganizationCode(
  identificationFactusCode?: string | null,
): string {
  return identificationFactusCode === NIT_FACTUS_CODE
    ? FACTUS_LEGAL_ORGANIZATION_JURIDICA
    : FACTUS_LEGAL_ORGANIZATION_NATURAL;
}

/**
 * La regla que sí impone la DIAN, y es la **inversa** de la que el sistema
 * asumía: una persona **jurídica** solo puede identificarse con NIT — una
 * empresa no tiene cédula. Lo contrario sí vale: una persona natural puede ir
 * con NIT (su cédula inscrita en el RUT).
 *
 * Se valida al guardar el usuario y no al emitir: si no, el rechazo llegaría
 * de la DIAN en mitad de una factura, que es el peor momento posible.
 */
export function isValidPersonTypeForDocument(
  legalOrganizationCode: string,
  identificationFactusCode?: string | null,
): boolean {
  if (legalOrganizationCode !== FACTUS_LEGAL_ORGANIZATION_JURIDICA) return true;
  return identificationFactusCode === NIT_FACTUS_CODE;
}

export const JURIDICA_REQUIRES_NIT_MESSAGE =
  'Una persona jurídica debe identificarse con NIT: una empresa no tiene ' +
  'cédula. Si es una persona natural inscrita en el RUT —que también tiene ' +
  'NIT—, elige "Persona natural".';

/** Normaliza lo que llega del front; cualquier cosa fuera del catálogo se descarta. */
export function normalizeLegalOrganizationCode(
  value: unknown,
): string | undefined {
  const code = typeof value === 'string' ? value.trim() : '';
  return (FACTUS_LEGAL_ORGANIZATION_CODES as readonly string[]).includes(code)
    ? code
    : undefined;
}

export function normalizeTributeCode(value: unknown): string | undefined {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return (FACTUS_TRIBUTE_CODES as readonly string[]).includes(code)
    ? code
    : undefined;
}
