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
