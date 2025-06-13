export interface SimplifiedInvoiceResponse {
  invoiceId: number;
  code: string;
  invoiceElectronic: boolean;
  subtotalWithoutTax?: number;
  subtotalWithTax?: number;
  total: number;
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
      name: string;
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
      name: string;
    };
  };
  invoiceDetails?: Array<{
    invoiceDetailId: number;
    taxeType?: {
      taxeTypeId: number;
      name: string;
      percentage: number;
    };
  }>;
  payType?: {
    payTypeId: number;
    code: string;
    name: string;
  };
  paidType?: {
    paidTypeId: number;
    code: string;
    name: string;
  };
  invoiceType?: {
    invoiceTypeId: number;
    code: string;
    name: string;
  };
}
