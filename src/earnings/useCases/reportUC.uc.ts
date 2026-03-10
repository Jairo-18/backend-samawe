import { Injectable } from '@nestjs/common';
import { ReportService } from '../services/report.service';
import { CategoryReportDto } from '../dtos/report.dto';
import {
  CategoryDetailReport,
  PaymentTypeReport,
} from '../interfaces/report.interface';

@Injectable()
export class ReportUC {
  constructor(private readonly _reportService: ReportService) {}

  async generateAllPaymentTypesReport(): Promise<PaymentTypeReport[]> {
    return await this._reportService.generateAllPaymentTypesReport();
  }

  async generateSalesByCategoryReport(): Promise<CategoryReportDto[]> {
    return await this._reportService.generateSalesByCategoryReport();
  }

  async generateSalesByCategoryWithDetails(): Promise<CategoryDetailReport[]> {
    return await this._reportService.generateSalesByCategoryWithDetails();
  }

  async getCategoryDetailsForPeriod(
    category: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  ) {
    return await this._reportService.getCategoryDetailsForPeriod(
      category,
      period,
    );
  }
}
