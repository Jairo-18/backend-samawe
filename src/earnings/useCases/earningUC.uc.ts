import { EarningService } from '../services/earning.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EarningUC {
  constructor(private readonly _earningService: EarningService) {}

  // getProductSummary(): Promise<BalanceProductSummaryDto> {
  //   return this._earningService.getProductSummary();
  // }

  // getInvoiceSummary(): Promise<BalanceInvoiceSummaryDto> {
  //   return this._earningService.getInvoiceSummary();
  // }

  // getTotalStock(): Promise<ProductStockCountDto> {
  //   return this._earningService.getTotalStock();
  // }
}
