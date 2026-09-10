/**
 * Documento soporte en adquisiciones a sujetos NO obligados a facturar
 * (Factus v2, `/v2/support-documents`). Es el documento que emite el
 * COMPRADOR para poder soportar el costo ante la DIAN, así que su contraparte
 * es un `provider` (proveedor), no un `customer`.
 */
export interface FactusSupportDocumentResult {
  /** Número asignado por Factus, p. ej. "DSE43". */
  number: string | null;
  referenceCode: string;
  isValidated: boolean;
  /** CUDS: el análogo del CUFE para el documento soporte. */
  cuds: string | null;
  qrCode: string | null;
  publicUrl: string | null;
  total: string;
  createdAt: string;
}

/** Estado de solo lectura del documento soporte de una compra. */
export interface FactusSupportDocumentStatus {
  issued: boolean;
  number: string | null;
  referenceCode: string | null;
  cuds: string | null;
  qrCode: string | null;
  publicUrl: string | null;
  sentAt: string | null;
}

/**
 * Tipos de documento de identidad que la DIAN acepta para el PROVEEDOR de un
 * documento soporte. Es una lista más corta que la de facturación: **no
 * incluye la cédula de ciudadanía (13)**, ni tarjeta de identidad (12), ni
 * registro civil (11). La doc de Factus lo dice explícitamente — "el proveedor
 * debe identificarse con NIT" — y en la práctica una persona natural no
 * obligada a facturar igual tiene NIT (normalmente su misma cédula, pero
 * registrada como NIT en el RUT).
 *
 * Ver "Códigos de tipos de documentos de identidad para Documentos Soporte y
 * Notas de ajuste" en las tablas de referencia de Factus.
 */
export const SUPPORT_DOCUMENT_ID_CODES = [
  '21', // Tarjeta de extranjería
  '22', // Cédula de extranjería
  '31', // NIT
  '41', // Pasaporte
  '42', // Documento de identificación extranjero
  '47', // PEP
  '50', // NIT otro país
] as const;
