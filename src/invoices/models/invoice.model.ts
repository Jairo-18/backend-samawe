export interface SimplifiedInvoiceResponse {
  invoiceId: number;
  code: string;
  invoiceElectronic: boolean;
  subtotalWithoutTax?: number;
  subtotalWithTax?: number;
  total: number;
  totalTaxes?: number;
  totalVat?: number;
  totalIco8?: number;
  totalIco5?: number;
  tableNumber?: string;
  orderTime?: Date;
  readyTime?: Date;
  servedTime?: Date;
  startDate: Date;
  endDate: Date;
  user?: {
    userId: string;
    identificationNumber: string;
    firstName: string;
    lastName: string;
    identificationType?: {
      identificationTypeId: number;
      code: string;
      name: Record<string, string>;
    };
  };
  employee?: {
    userId: string;
    identificationNumber: string;
    firstName: string;
    lastName: string;
    identificationType?: {
      identificationTypeId: number;
      code: string;
      name: Record<string, string>;
    };
  };
  invoiceDetails?: Array<{
    invoiceDetailId: number;
    taxeType?: {
      taxeTypeId: number;
      name: Record<string, string>;
      percentage: number;
    };
  }>;
  payType?: {
    payTypeId: number;
    code: string;
    name: Record<string, string>;
  };
  paidType?: {
    paidTypeId: number;
    code: string;
    name: Record<string, string>;
  };
  invoiceType?: {
    invoiceTypeId: number;
    code: string;
    name: Record<string, string>;
  };
  stateType?: {
    stateTypeId: number;
    code: string;
    name: Record<string, string>;
  };
}
