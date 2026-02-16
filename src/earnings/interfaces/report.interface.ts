// interfaces/report.interface.ts

export interface PaymentTypeReport {
  paymentType: string;
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
  yearlyCount: number;
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  yearlyTotal: number;
}

export interface CategoryReportSummary {
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
  yearlyCount: number;
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  yearlyTotal: number;
}

export interface CategoryDetailItem {
  invoiceDetailId: number;
  invoiceId: number;
  invoiceDate: Date;
  subtotal: number;
  amount: number;
  itemType: 'PRODUCT' | 'ACCOMMODATION' | 'EXCURSION' | 'UNKNOWN';
  itemName: string;
  period?: string; // Para identificar el período cuando se usa en el reporte completo
}

export interface CategoryDetailReport {
  category: string;
  summary: CategoryReportSummary;
  details: {
    daily: CategoryDetailItem[];
    weekly: CategoryDetailItem[];
    monthly: CategoryDetailItem[];
    yearly: CategoryDetailItem[];
  };
}
