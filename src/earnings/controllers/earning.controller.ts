import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { InventoryService } from './../services/inventory.service';
import {
  InventoryLowParamsDto,
  LowAmountProductDto,
} from './../dtos/inventoryAmount.dto';
import { StatisticsService } from './../services/statistics.service';
import { Controller, Get, UseGuards, Query } from '@nestjs/common';
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
    private readonly _inventoryService: InventoryService,
  ) {}

  @Get('general')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GeneralStatisticsDto })
  async getGeneralStatistics(): Promise<GeneralStatisticsDto> {
    return this._statisticsService.getGeneralStatistics();
  }

  @Get('product-summary')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: BalanceProductSummaryDto })
  getProductSummary(): Promise<BalanceProductSummaryDto> {
    return this._balanceSummaryService.getProductSummary();
  }

  @Get('invoice-summary')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: AllInvoiceSummariesDto })
  getInvoiceSummary(): Promise<AllInvoiceSummariesDto> {
    return this._balanceSummaryService.getAllInvoiceSummaries();
  }

  @Get('total-stock')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: ProductStockCountDto })
  getTotalStock(): Promise<ProductStockCountDto> {
    return this._balanceSummaryService.getTotalStock();
  }

  @Get('invoice-chart-list')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: InvoiceChartListDto })
  getInvoiceChartList(): Promise<InvoiceChartListDto> {
    return this._balanceSummaryService.getInvoiceChartList();
  }

  @Get('paginated-list-inventory-low')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({
    type: ResponsePaginationDto<LowAmountProductDto>,
  })
  async getInventoryAmount(
    @Query() params: InventoryLowParamsDto,
  ): Promise<ResponsePaginationDto<LowAmountProductDto>> {
    return this._inventoryService.paginatedList(params);
  }
}
