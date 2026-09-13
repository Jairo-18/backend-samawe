import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  InventoryLowParamsDto,
  LowAmountProductDto,
} from './../dtos/inventoryAmount.dto';
import { Controller, Get, Post, UseGuards, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { BalanceService } from '../../shared/services/balance.service';

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
  constructor(
    private readonly _earningUC: EarningUC,
    private readonly _balanceService: BalanceService,
  ) {}

  /**
   * Recalcula de cero TODOS los balances guardados, periodo por periodo, y el
   * valor de inventario actual.
   *
   * La tabla `Balance` es un caché: se actualiza sola cuando pasa algo en una
   * factura, pero no cuando cambia la FÓRMULA. Tras corregir el neteo —hasta el
   * 13 sep 2026 solo restaba notas crédito, e ignoraba las de ajuste sobre
   * compras y las de débito sobre ventas— los valores viejos siguen guardados
   * con el cálculo antiguo. Esta ruta es la que los cuadra.
   *
   * Es idempotente: recalcula desde las facturas, no acumula. Se puede llamar
   * las veces que haga falta. Restringida a SUPERADMIN/ADMIN porque recorre
   * todo el histórico y puede tardar.
   */
  @Post('recalculate')
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN)
  @ApiOperation({
    summary:
      'Recalcular todos los balances guardados (tras cambiar la fórmula de neteo)',
  })
  async recalculate(): Promise<{ success: boolean; message: string }> {
    await this._balanceService.recalculateAllBalances();
    await this._balanceService.updateBalanceWithCurrentProducts();
    return {
      success: true,
      message:
        'Balances recalculados con el neteo de notas crédito, débito y de ajuste.',
    };
  }

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
