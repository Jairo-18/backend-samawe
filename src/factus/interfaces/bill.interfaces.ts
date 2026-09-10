export interface BillItemInput {
  codeReference: string;
  name: string;
  quantity: string | number;
  price: string | number;
  discountRate?: string | number;
  unitMeasureCode?: string;
  standardCode?: string;
  taxCode: string;
  taxRate: string | number;
}

export interface BillCustomerInput {
  identificationType: string;
  identification: string;
  dv?: string;
  legalOrganization?: string;
  tributeCode?: string;
  company?: string;
  names?: string;
  tradeName?: string;
  address: string;
  email: string;
  phone: string;
  municipalityCode: string;
}

export interface CreateBillOptions {
  referenceCode?: string;
  numberingRangeId?: number;
  observation?: string;
  customer: BillCustomerInput;
  paymentForm: string;
  paymentMethodCode: string;
  paymentReferenceCode?: string;
  paymentAmount?: string | number;
  dueDate?: string;
  items: BillItemInput[];
}

export interface FactusBillResult {
  billNumber: string | null;
  referenceCode: string | null;
  isValidated: boolean;
  cufe: string | null;
  qrCode: string | null;
  publicUrl?: string | null;
  createdAt: string;
}

/** Rango de numeración DIAN devuelto por GET /v2/numbering-ranges. */
export interface FactusNumberingRange {
  id: number;
  document: string; // nombre del documento, ej. "Factura de Venta"
  prefix: string;
  from: number;
  to: number;
  /** Siguiente número que se generará (NO el último emitido). */
  current: number;
  resolution_number?: string;
  start_date?: string;
  end_date?: string;
  technical_key?: string;
  is_active: number | boolean;
  is_expired: number | boolean;
}

/**
 * Familias de documento que este sistema emite. Factus devuelve `document`
 * como texto libre ("Factura de Venta", "Factura Electrónica de Venta"…), así
 * que la clasificación se hace por palabras, no por igualdad.
 */
export type FactusDocumentKind = 'sales' | 'creditNote' | 'supportDocument';

/**
 * Un rango tal como lo ve el contador: qué documento numera, en qué número va
 * y cuánto le queda de vigencia. Se calcula en vivo contra Factus — el
 * consecutivo NO se espeja en la base, porque Factus es su fuente de verdad y
 * una copia local mentiría en cuanto alguien emitiera desde el portal.
 */
export interface FactusNumberingRangeOverview {
  id: number;
  /** Clasificación propia; `null` si el documento no es de los que emitimos. */
  kind: FactusDocumentKind | null;
  documentName: string;
  prefix: string;
  from: number;
  to: number;
  /** Siguiente número a emitir. */
  current: number;
  /** Cuántos números quedan sin usar en el rango. */
  remaining: number;
  resolutionNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isExpired: boolean;
  /** Días hasta el vencimiento; negativo si ya venció, `null` si no hay fecha. */
  daysToExpire: number | null;
  /** Semáforo para la vista: verde / por vencer / vencido / inactivo. */
  status: 'ok' | 'expiring' | 'expired' | 'inactive';
}
