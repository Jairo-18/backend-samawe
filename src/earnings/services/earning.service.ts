import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BalanceProductSummaryDto,
  BalanceInvoiceSummaryDto,
  ProductStockCountDto,
  AllInvoiceSummariesDto,
} from './../dtos/earning.dto';
import { BalanceRepository } from './../../shared/repositories/balance.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { BalanceType } from './../../shared/constants/balanceType.constants';
import { Balance } from './../../shared/entities/balance.entity';

@Injectable()
export class EarningService {
  constructor(
    private readonly _balanceRepository: BalanceRepository,
    private readonly _productRepository: ProductRepository,
  ) {}

  async getLatestDailyBalance(): Promise<Balance> {
    const daily = await this._balanceRepository.findOne({
      where: { type: BalanceType.DAILY },
      order: { periodDate: 'DESC' },
    });
    if (!daily) throw new NotFoundException('Daily balance not found');
    return daily;
  }

  private async getLatestBalanceByType(
    type: BalanceType,
  ): Promise<Balance | null> {
    return await this._balanceRepository.findOne({
      where: { type },
      order: { periodDate: 'DESC' },
    });
  }

  async getProductSummary(): Promise<BalanceProductSummaryDto> {
    const daily = await this.getLatestBalanceByType(BalanceType.DAILY);
    if (!daily) throw new NotFoundException('Daily balance not found');
    const { totalProductPriceSale, totalProductPriceBuy, balanceProduct } =
      daily;
    return { totalProductPriceSale, totalProductPriceBuy, balanceProduct };
  }

  async getInvoiceSummary(
    type: BalanceType,
  ): Promise<BalanceInvoiceSummaryDto> {
    const balance = await this.getLatestBalanceByType(type);
    if (!balance) throw new NotFoundException(`${type} balance not found`);
    const { totalInvoiceSale, totalInvoiceBuy, balanceInvoice, periodDate } =
      balance;
    return {
      totalInvoiceSale,
      totalInvoiceBuy,
      balanceInvoice,
      periodDate: new Date(periodDate).toISOString().split('T')[0],
      type,
    };
  }

  async getAllInvoiceSummaries(): Promise<AllInvoiceSummariesDto> {
    const types = [
      BalanceType.DAILY,
      BalanceType.WEEKLY,
      BalanceType.MONTHLY,
      BalanceType.YEARLY,
    ];

    const results = await Promise.all(
      types.map(async (type) => {
        try {
          return await this.getInvoiceSummary(type);
        } catch {
          return null;
        }
      }),
    );

    return {
      daily: results[0],
      weekly: results[1],
      monthly: results[2],
      yearly: results[3],
    };
  }

  async getTotalStock(): Promise<ProductStockCountDto> {
    const { sum } = await this._productRepository
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'sum')
      .getRawOne();
    return { totalStock: Number(sum || 0) };
  }
}
