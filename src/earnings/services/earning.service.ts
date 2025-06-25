import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BalanceProductSummaryDto,
  BalanceInvoiceSummaryDto,
  ProductStockCountDto,
  AllInvoiceSummariesDto,
  InvoiceChartListDto,
  InvoiceChartItemDto,
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
    private readonly _invoiceRepository: InvoiceRepository,
  ) {}

  async getLatestDailyBalance(): Promise<Balance> {
    const daily = await this._balanceRepository.findOne({
      where: { type: BalanceType.DAILY },
      order: { periodDate: 'DESC' },
    });
    if (!daily) throw new NotFoundException('No hay un balance diario aún');
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
    if (!daily) {
      return {
        totalProductPriceSale: 0,
        totalProductPriceBuy: 0,
        balanceProduct: 0,
      };
    }

    const { totalProductPriceSale, totalProductPriceBuy, balanceProduct } =
      daily;
    return { totalProductPriceSale, totalProductPriceBuy, balanceProduct };
  }

  async getInvoiceSummary(
    type: BalanceType,
  ): Promise<BalanceInvoiceSummaryDto> {
    const balance = await this.getLatestBalanceByType(type);
    if (!balance) {
      return {
        totalInvoiceSale: 0,
        totalInvoiceBuy: 0,
        balanceInvoice: 0,
        periodDate: new Date().toISOString().split('T')[0],
        type,
      };
    }

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

  async getInvoiceChartList(): Promise<InvoiceChartListDto> {
    const now = new Date();

    const getRange = (type: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
      const colombiaOffset = -5 * 60; // UTC-5 en minutos
      const localTime = now.getTime();
      const localOffset = now.getTimezoneOffset() * 60000;
      const utc = localTime + localOffset;
      const colombiaTime = new Date(utc + colombiaOffset * 60000);

      const start = new Date(colombiaTime);
      const end = new Date(colombiaTime);

      switch (type) {
        case 'daily':
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          const day = colombiaTime.getDay() || 7;
          start.setDate(colombiaTime.getDate() - day + 1);
          start.setHours(0, 0, 0, 0);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          break;
        case 'monthly':
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(start.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'yearly':
          start.setMonth(0, 1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(11, 31);
          end.setHours(23, 59, 59, 999);
          break;
      }

      const startUTC = new Date(start.getTime() - colombiaOffset * 60000);
      const endUTC = new Date(end.getTime() - colombiaOffset * 60000);

      return { start: startUTC, end: endUTC };
    };

    const types: ('daily' | 'weekly' | 'monthly' | 'yearly')[] = [
      'daily',
      'weekly',
      'monthly',
      'yearly',
    ];

    const results = await Promise.all(
      types.map(async (type) => {
        const { start, end } = getRange(type);

        const invoices = await this._invoiceRepository
          .createQueryBuilder('invoice')
          .leftJoinAndSelect('invoice.invoiceType', 'invoiceType')
          .where('invoice.createdAt BETWEEN :start AND :end', {
            start: start.toISOString(),
            end: end.toISOString(),
          })
          .andWhere('invoice.deletedAt IS NULL')
          .andWhere('invoiceType.deletedAt IS NULL')
          .select([
            'invoice.code AS code',
            'invoice.total AS total',
            'invoice.createdAt AS "createdAt"',
            'invoiceType.code AS "invoiceTypeCode"',
          ])
          .orderBy('invoice.createdAt', 'ASC')
          .getRawMany();

        const formatted: InvoiceChartItemDto[] = invoices.map((inv) => ({
          code: inv.code,
          total: Number(inv.total),
          type:
            inv.invoiceTypeCode === 'FV'
              ? 'FV'
              : inv.invoiceTypeCode === 'FC'
                ? 'FC'
                : 'other',
          createdAt: new Date(inv.createdAt),
        }));

        return { type, data: formatted };
      }),
    );

    const response = {} as InvoiceChartListDto;
    results.forEach((r) => {
      response[r.type] = r.data;
    });

    return response;
  }
}
