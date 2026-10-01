import { Injectable } from '@nestjs/common';
import { EarningService } from '../services/earning.service';
import { StatisticsService } from '../services/statistics.service';
import { InventoryService } from '../services/inventory.service';
import { DashboardService } from '../services/dashboard.service';
import { DashboardResponse } from '../dtos/dashboard.dto';
import { CustomRange, DashboardPeriod } from '../utils/period-range.utils';
import { TtlCache } from '../../shared/utils/ttl-cache';
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

/** El tablero se recalcula como mucho una vez por minuto por organización y período. */
const DASHBOARD_TTL_MS = 60_000;

@Injectable()
export class EarningUC {
  private readonly _dashboardCache = new TtlCache<DashboardResponse>(
    DASHBOARD_TTL_MS,
    100,
  );
  /** Cálculos en curso: dos peticiones iguales a la vez comparten uno solo. */
  private readonly _dashboardInflight = new Map<
    string,
    Promise<DashboardResponse>
  >();

  constructor(
    private readonly _earningService: EarningService,
    private readonly _statisticsService: StatisticsService,
    private readonly _inventoryService: InventoryService,
    private readonly _dashboardService: DashboardService,
  ) {}

  async getGeneralStatistics(
    organizationalId?: string,
  ): Promise<GeneralStatisticsDto> {
    return await this._statisticsService.getGeneralStatistics(organizationalId);
  }

  async getProductSummary(
    organizationalId?: string,
  ): Promise<BalanceProductSummaryDto> {
    return await this._earningService.getProductSummary(organizationalId);
  }

  async getAllInvoiceSummaries(
    organizationalId?: string,
  ): Promise<AllInvoiceSummariesDto> {
    return await this._earningService.getAllInvoiceSummaries(organizationalId);
  }

  async getTotalStock(
    organizationalId?: string,
  ): Promise<ProductStockCountDto> {
    return await this._earningService.getTotalStock(organizationalId);
  }

  async getInvoiceChartList(
    organizationalId?: string,
  ): Promise<InvoiceChartListDto> {
    return await this._earningService.getInvoiceChartList(organizationalId);
  }

  async getDashboard(
    period: DashboardPeriod,
    organizationalId?: string,
    custom?: CustomRange,
  ): Promise<DashboardResponse> {
    // Son ~7 consultas por llamada (más las notas y las líneas de factura) y el
    // tablero se pide en cada visita y cada cambio de período. Un minuto de
    // retraso en un tablero no importa; la carga sobre la base de datos sí.
    const key = [organizationalId ?? '', period, custom?.from ?? '', custom?.to ?? ''].join('|');
    const cached = this._dashboardCache.get(key);
    if (cached) return cached;

    const running = this._dashboardInflight.get(key);
    if (running) return running;

    const promise = this._dashboardService
      .getDashboard(period, organizationalId, new Date(), custom)
      .then((value) => {
        this._dashboardCache.set(key, value);
        return value;
      })
      .finally(() => this._dashboardInflight.delete(key));
    this._dashboardInflight.set(key, promise);
    return promise;
  }

  async getInventoryAmount(
    params: InventoryLowParamsDto,
  ): Promise<ResponsePaginationDto<LowAmountProductDto>> {
    return await this._inventoryService.paginatedList(params);
  }
}
