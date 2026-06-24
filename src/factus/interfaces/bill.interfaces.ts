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
  current: number;
  is_active: number | boolean;
  is_expired: number | boolean;
}
