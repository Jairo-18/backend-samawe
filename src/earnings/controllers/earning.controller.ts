import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  InventoryLowParamsDto,
  LowAmountProductDto,
} from './../dtos/inventoryAmount.dto';
import { Controller, Get, UseGuards, Query, Req } from '@nestjs/common';
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
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';

@Controller('balance')
@ApiTags('Ganancias / Reportes')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.EMP,
  RolesUser.MES,
  RolesUser.CHE,
)
export class EarningController {
  constructor(private readonly _earningUC: EarningUC) {}

  @Get('general')
  @GetGeneralStatisticsDocs()
  async getGeneralStatistics(@Req() req: any): Promise<GeneralStatisticsDto> {
    const organizationalId = req.user?.organizationalId;
    return await this._earningUC.getGeneralStatistics(organizationalId);
  }

  @Get('product-summary')
  @GetProductSummaryDocs()
  async getProductSummary(@Req() req: any): Promise<BalanceProductSummaryDto> {
    const organizationalId = req.user?.organizationalId;
    return await this._earningUC.getProductSummary(organizationalId);
  }

  @Get('invoice-summary')
  @GetInvoiceSummaryDocs()
  async getInvoiceSummary(@Req() req: any): Promise<AllInvoiceSummariesDto> {
    const organizationalId = req.user?.organizationalId;
    return await this._earningUC.getAllInvoiceSummaries(organizationalId);
  }

  @Get('total-stock')
  @GetTotalStockDocs()
  async getTotalStock(@Req() req: any): Promise<ProductStockCountDto> {
    const organizationalId = req.user?.organizationalId;
    return await this._earningUC.getTotalStock(organizationalId);
  }

  @Get('invoice-chart-list')
  @GetInvoiceChartListDocs()
  async getInvoiceChartList(@Req() req: any): Promise<InvoiceChartListDto> {
    const organizationalId = req.user?.organizationalId;
    return await this._earningUC.getInvoiceChartList(organizationalId);
  }

  @Get('paginated-list-inventory-low')
  @GetInventoryAmountDocs()
  async getInventoryAmount(
    @Query() params: InventoryLowParamsDto,
    @Req() req: any,
  ): Promise<ResponsePaginationDto<LowAmountProductDto>> {
    params.organizationalId = req.user?.organizationalId;
    return await this._earningUC.getInventoryAmount(params);
  }
}
