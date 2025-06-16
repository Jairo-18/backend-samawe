export class BalanceProductSummaryDto {
  totalProductPriceSale: number;
  totalProductPriceBuy: number;
  balanceProduct: number;
}

export class BalanceInvoiceSummaryDto {
  type: string; // BalanceType
  periodDate: string; // ISO Date
  totalInvoiceSale: number;
  totalInvoiceBuy: number;
  balanceInvoice: number;
}

export class ProductStockCountDto {
  totalStock: number;
}

export class AllInvoiceSummariesDto {
  daily: BalanceInvoiceSummaryDto | null;
  weekly: BalanceInvoiceSummaryDto | null;
  monthly: BalanceInvoiceSummaryDto | null;
  yearly: BalanceInvoiceSummaryDto | null;
}

export class InvoiceChartItemDto {
  code: string;
  type: 'FV' | 'FC' | 'other'; // Asegúrate que coincida con lo que devuelves
  total: number;
  createdAt: Date;
}

export class InvoiceChartListDto {
  daily: InvoiceChartItemDto[];
  weekly: InvoiceChartItemDto[];
  monthly: InvoiceChartItemDto[];
  yearly: InvoiceChartItemDto[];
}
