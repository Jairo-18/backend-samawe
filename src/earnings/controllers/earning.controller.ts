import { StatisticsService } from './../services/statistics.service';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import {
  AllInvoiceSummariesDto,
  BalanceProductSummaryDto,
  InvoiceChartListDto,
  ProductStockCountDto,
} from '../dtos/earning.dto';
import { EarningService } from '../services/earning.service';
import { AuthGuard } from '@nestjs/passport';
import { GeneralStatisticsDto } from '../dtos/generalStatistics.dto';

@Controller('balance')
@ApiTags('Ganancias / Reportes')
export class EarningController {
  constructor(
    private readonly _balanceSummaryService: EarningService,
    private readonly _statisticsService: StatisticsService,
  ) {}

  @Get('general')
  @ApiOkResponse({ type: GeneralStatisticsDto })
  async getGeneralStatistics(): Promise<GeneralStatisticsDto> {
    return this._statisticsService.getGeneralStatistics();
  }

  @Get('product-summary')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  getProductSummary(): Promise<BalanceProductSummaryDto> {
    return this._balanceSummaryService.getProductSummary();
  }

  @Get('invoice-summary')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  getInvoiceSummary(): Promise<AllInvoiceSummariesDto> {
    return this._balanceSummaryService.getAllInvoiceSummaries();
  }

  @Get('total-stock')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  getTotalStock(): Promise<ProductStockCountDto> {
    return this._balanceSummaryService.getTotalStock();
  }

  @Get('invoice-chart-list')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  getInvoiceChartList(): Promise<InvoiceChartListDto> {
    return this._balanceSummaryService.getInvoiceChartList();
  }
}
