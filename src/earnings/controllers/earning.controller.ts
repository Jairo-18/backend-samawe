import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  AllInvoiceSummariesDto,
  BalanceProductSummaryDto,
  InvoiceChartListDto,
  ProductStockCountDto,
} from '../dtos/earning.dto';
import { EarningService } from '../services/earning.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('balance')
@ApiTags('Ganancias / Reportes')
export class EarningController {
  constructor(private readonly balanceSummaryService: EarningService) {}

  @Get('product-summary')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  getProductSummary(): Promise<BalanceProductSummaryDto> {
    return this.balanceSummaryService.getProductSummary();
  }

  @Get('invoice-summary')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  getInvoiceSummary(): Promise<AllInvoiceSummariesDto> {
    return this.balanceSummaryService.getAllInvoiceSummaries();
  }

  @Get('total-stock')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  getTotalStock(): Promise<ProductStockCountDto> {
    return this.balanceSummaryService.getTotalStock();
  }

  @Get('invoice-chart-list')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  getInvoiceChartList(): Promise<InvoiceChartListDto> {
    return this.balanceSummaryService.getInvoiceChartList();
  }
}
