import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  InventoryLowParamsDto,
  LowAmountProductDto,
} from './../dtos/inventoryAmount.dto';
import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AllInvoiceSummariesDto,
  BalanceProductSummaryDto,
  InvoiceChartListDto,
  ProductStockCountDto,
} from '../dtos/earning.dto';
import { AuthGuard } from '@nestjs/passport';
import { GeneralStatisticsDto } from '../dtos/generalStatistics.dto';
import { EarningUC } from '../useCases/earningUC.uc';
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
  constructor(private readonly _earningUC: EarningUC) {}

  @Get('general')
  @GetGeneralStatisticsDocs()
  async getGeneralStatistics(): Promise<GeneralStatisticsDto> {
    return await this._earningUC.getGeneralStatistics();
  }

  @Get('product-summary')
  @GetProductSummaryDocs()
  async getProductSummary(): Promise<BalanceProductSummaryDto> {
    return await this._earningUC.getProductSummary();
  }

  @Get('invoice-summary')
  @GetInvoiceSummaryDocs()
  async getInvoiceSummary(): Promise<AllInvoiceSummariesDto> {
    return await this._earningUC.getAllInvoiceSummaries();
  }

  @Get('total-stock')
  @GetTotalStockDocs()
  async getTotalStock(): Promise<ProductStockCountDto> {
    return await this._earningUC.getTotalStock();
  }

  @Get('invoice-chart-list')
  @GetInvoiceChartListDocs()
  async getInvoiceChartList(): Promise<InvoiceChartListDto> {
    return await this._earningUC.getInvoiceChartList();
  }

  @Get('paginated-list-inventory-low')
  @GetInventoryAmountDocs()
  async getInventoryAmount(
    @Query() params: InventoryLowParamsDto,
  ): Promise<ResponsePaginationDto<LowAmountProductDto>> {
    return await this._earningUC.getInventoryAmount(params);
  }
}
