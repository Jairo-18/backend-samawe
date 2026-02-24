import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { InventoryService } from './../services/inventory.service';
import {
  InventoryLowParamsDto,
  LowAmountProductDto,
} from './../dtos/inventoryAmount.dto';
import { StatisticsService } from './../services/statistics.service';
import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AllInvoiceSummariesDto,
  BalanceProductSummaryDto,
  InvoiceChartListDto,
  ProductStockCountDto,
} from '../dtos/earning.dto';
import { EarningService } from '../services/earning.service';
import { AuthGuard } from '@nestjs/passport';
import { GeneralStatisticsDto } from '../dtos/generalStatistics.dto';
import {
  GetGeneralStatisticsDocs,
  GetProductSummaryDocs,
  GetInvoiceSummaryDocs,
  GetTotalStockDocs,
  GetInvoiceChartListDocs,
  GetInventoryAmountDocs,
} from '../decorators/earning.decorators';

@Controller('balance')
@ApiTags('Ganancias / Reportes')
@UseGuards(AuthGuard())
export class EarningController {
  constructor(
    private readonly _balanceSummaryService: EarningService,
    private readonly _statisticsService: StatisticsService,
    private readonly _inventoryService: InventoryService,
  ) {}

  @Get('general')
  @GetGeneralStatisticsDocs()
  async getGeneralStatistics(): Promise<GeneralStatisticsDto> {
    return this._statisticsService.getGeneralStatistics();
  }

  @Get('product-summary')
  @GetProductSummaryDocs()
  getProductSummary(): Promise<BalanceProductSummaryDto> {
    return this._balanceSummaryService.getProductSummary();
  }

  @Get('invoice-summary')
  @GetInvoiceSummaryDocs()
  getInvoiceSummary(): Promise<AllInvoiceSummariesDto> {
    return this._balanceSummaryService.getAllInvoiceSummaries();
  }

  @Get('total-stock')
  @GetTotalStockDocs()
  getTotalStock(): Promise<ProductStockCountDto> {
    return this._balanceSummaryService.getTotalStock();
  }

  @Get('invoice-chart-list')
  @GetInvoiceChartListDocs()
  getInvoiceChartList(): Promise<InvoiceChartListDto> {
    return this._balanceSummaryService.getInvoiceChartList();
  }

  @Get('paginated-list-inventory-low')
  @GetInventoryAmountDocs()
  async getInventoryAmount(
    @Query() params: InventoryLowParamsDto,
  ): Promise<ResponsePaginationDto<LowAmountProductDto>> {
    return this._inventoryService.paginatedList(params);
  }
}
