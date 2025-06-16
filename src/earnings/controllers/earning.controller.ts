import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  AllInvoiceSummariesDto,
  BalanceProductSummaryDto,
  InvoiceChartListDto,
  ProductStockCountDto,
} from '../dtos/earning.dto';
import { EarningService } from '../services/earning.service';

@Controller('balance')
@ApiTags('Ganancias / Reportes')
export class EarningController {
  constructor(private readonly balanceSummaryService: EarningService) {}

  @Get('product-summary')
  getProductSummary(): Promise<BalanceProductSummaryDto> {
    return this.balanceSummaryService.getProductSummary();
  }

  @Get('invoice-summary')
  getInvoiceSummary(): Promise<AllInvoiceSummariesDto> {
    return this.balanceSummaryService.getAllInvoiceSummaries();
  }

  @Get('total-stock')
  getTotalStock(): Promise<ProductStockCountDto> {
    return this.balanceSummaryService.getTotalStock();
  }

  @Get('invoice-chart-list')
  getInvoiceChartList(): Promise<InvoiceChartListDto> {
    return this.balanceSummaryService.getInvoiceChartList();
  }
}
