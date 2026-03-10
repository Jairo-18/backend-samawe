import { Injectable } from '@nestjs/common';
import { EarningService } from '../services/earning.service';
import { StatisticsService } from '../services/statistics.service';
import { InventoryService } from '../services/inventory.service';
import {
  AllInvoiceSummariesDto,
  BalanceProductSummaryDto,
  InvoiceChartListDto,
  ProductStockCountDto,
} from '../dtos/earning.dto';
import { GeneralStatisticsDto } from '../dtos/generalStatistics.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  InventoryLowParamsDto,
  LowAmountProductDto,
} from './../dtos/inventoryAmount.dto';

@Injectable()
export class EarningUC {
  constructor(
    private readonly _earningService: EarningService,
    private readonly _statisticsService: StatisticsService,
    private readonly _inventoryService: InventoryService,
  ) {}

  async getGeneralStatistics(): Promise<GeneralStatisticsDto> {
    return await this._statisticsService.getGeneralStatistics();
  }

  async getProductSummary(): Promise<BalanceProductSummaryDto> {
    return await this._earningService.getProductSummary();
  }

  async getAllInvoiceSummaries(): Promise<AllInvoiceSummariesDto> {
    return await this._earningService.getAllInvoiceSummaries();
  }

  async getTotalStock(): Promise<ProductStockCountDto> {
    return await this._earningService.getTotalStock();
  }

  async getInvoiceChartList(): Promise<InvoiceChartListDto> {
    return await this._earningService.getInvoiceChartList();
  }

  async getInventoryAmount(
    params: InventoryLowParamsDto,
  ): Promise<ResponsePaginationDto<LowAmountProductDto>> {
    return await this._inventoryService.paginatedList(params);
  }
}
