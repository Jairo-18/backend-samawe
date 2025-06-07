import {
  InventoryTotalDto,
  InvoiceTotalsDto,
  CountAndTotalItemsDto,
  TotalWithProducts,
} from '../dtos/earning.dto';
import { EarningService } from '../services/earning.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EarningUC {
  constructor(private readonly _earningService: EarningService) {}

  async getInvoiceTotals(): Promise<InvoiceTotalsDto> {
    return this._earningService.getInvoiceTotalsOnly();
  }

  async getSoldStats(): Promise<CountAndTotalItemsDto> {
    return this._earningService.getSoldStatsOnly();
  }

  async getInventory(): Promise<InventoryTotalDto> {
    return this._earningService.getInventoryOnly();
  }

  async getTotalSalesPlusInventory(): Promise<TotalWithProducts> {
    return this._earningService.getTotalSalesPlusInventoryOnly();
  }
}
