import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { EarningUC } from '../useCases/earningUC.uc';
import {
  InventoryTotalDto,
  InvoiceTotalsDto,
  CountAndTotalItemsDto,
  TotalWithProducts,
} from '../dtos/earning.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('earning')
@ApiTags('Ganancias / Reportes')
export class EarningController {
  constructor(private readonly _earningUC: EarningUC) {}

  @Get('general-earnigs')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: InvoiceTotalsDto })
  async getInvoiceTotals(): Promise<InvoiceTotalsDto> {
    return this._earningUC.getInvoiceTotals();
  }

  @Get('count-total-items')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CountAndTotalItemsDto })
  async getSoldStats(): Promise<CountAndTotalItemsDto> {
    return this._earningUC.getSoldStats();
  }

  @Get('inventory-total')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: InventoryTotalDto })
  async getInventory(): Promise<InventoryTotalDto> {
    return this._earningUC.getInventory();
  }

  @Get('total-sales-with-inventory')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: TotalWithProducts })
  async getTotalSalesPlusInventory(): Promise<TotalWithProducts> {
    return this._earningUC.getTotalSalesPlusInventory();
  }
}
