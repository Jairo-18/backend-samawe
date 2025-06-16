import { ProductRepository } from './../repositories/product.repository';
import { Injectable } from '@nestjs/common';
import { BalanceRepository } from './../repositories/balance.repository';
import { Invoice } from './../entities/invoice.entity';
import { BalanceType } from '../constants/balanceType.constants';
import { Between, In } from 'typeorm';
import { Balance } from '../entities/balance.entity';

@Injectable()
export class BalanceService {
  constructor(
    private readonly _balanceRepository: BalanceRepository,
    private readonly _productRepository: ProductRepository,
  ) {}

  private getTodayDate(): Date {
    const today = new Date();
    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0,
    );
  }

  private getPeriodDate(type: BalanceType): Date {
    const now = new Date();
    switch (type) {
      case BalanceType.DAILY:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());

      case BalanceType.WEEKLY: {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(now.getFullYear(), now.getMonth(), diff);
      }

      case BalanceType.MONTHLY:
        return new Date(now.getFullYear(), now.getMonth(), 1);

      case BalanceType.YEARLY:
        return new Date(now.getFullYear(), 0, 1);

      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  private getPeriodDateFromDate(type: BalanceType, date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    switch (type) {
      case BalanceType.WEEKLY: {
        const day = d.getDay();
        d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        break;
      }
      case BalanceType.MONTHLY:
        d.setDate(1);
        break;
      case BalanceType.YEARLY:
        d.setMonth(0, 1);
        break;
    }

    return d;
  }

  private getPeriodEndDate(type: BalanceType, periodDate: Date): Date {
    const endDate = new Date(periodDate);

    switch (type) {
      case BalanceType.DAILY:
        endDate.setDate(endDate.getDate() + 1);
        break;
      case BalanceType.WEEKLY:
        endDate.setDate(endDate.getDate() + 7);
        break;
      case BalanceType.MONTHLY:
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case BalanceType.YEARLY:
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    return endDate;
  }

  async updateBalanceWithInvoice(invoice: Invoice): Promise<void> {
    const isSale = invoice.invoiceType.code === 'FV';
    const amount = Number(invoice.total) || 0;
    const invoiceDate = new Date(invoice.createdAt);

    if (isNaN(amount))
      throw new Error(
        `Invalid amount in invoice ${invoice.invoiceId}: ${invoice.total}`,
      );
    if (!invoiceDate || isNaN(invoiceDate.getTime()))
      throw new Error(`Invalid date in invoice ${invoice.invoiceId}`);

    for (const type of Object.values(BalanceType)) {
      const periodDate = this.getPeriodDateFromDate(type, invoiceDate);

      await this._balanceRepository.manager.transaction(async (manager) => {
        let balance = await manager.findOne(Balance, {
          where: { type, periodDate },
          lock: { mode: 'pessimistic_write' },
        });

        const invoices = await manager.find(Invoice, {
          where: {
            createdAt: Between(
              periodDate,
              this.getPeriodEndDate(type, periodDate),
            ),
            invoiceType: { code: In(['FV', 'FC']) },
          },
          relations: ['invoiceType'],
        });

        let totalSales = 0;
        let totalPurchases = 0;

        for (const inv of invoices) {
          const invAmount = Number(inv.total) || 0;
          if (inv.invoiceType.code === 'FV') totalSales += invAmount;
          else totalPurchases += invAmount;
        }

        if (!balance) {
          balance = manager.create(Balance, {
            type,
            periodDate,
          });
        }

        balance.totalInvoiceSale = totalSales;
        balance.totalInvoiceBuy = totalPurchases;
        balance.balanceInvoice = totalSales - totalPurchases;

        await manager.save(balance);
      });
    }
  }

  async removeInvoiceFromBalance(invoice: Invoice): Promise<void> {
    await this.updateBalanceWithInvoice(invoice);
  }

  async updateBalanceWithCurrentProducts(): Promise<void> {
    const products = await this._productRepository.find();

    let totalProductPriceSale = 0;
    let totalProductPriceBuy = 0;

    for (const product of products) {
      const amount = Number(product.amount ?? 0);
      const priceSale = Number(product.priceSale ?? 0);
      const priceBuy = Number(product.priceBuy ?? 0);

      totalProductPriceSale += amount * priceSale;
      totalProductPriceBuy += amount * priceBuy;
    }

    const balanceProduct = totalProductPriceSale - totalProductPriceBuy;
    const today = this.getTodayDate();

    for (const type of Object.values(BalanceType)) {
      const periodDate = this.getPeriodDateFromDate(type, today);

      await this._balanceRepository.manager.transaction(async (manager) => {
        let balance = await manager.findOne(Balance, {
          where: { type, periodDate },
          lock: { mode: 'pessimistic_write' },
        });

        if (!balance) {
          balance = manager.create(Balance, {
            type,
            periodDate,
          });
        }

        balance.totalProductPriceSale = totalProductPriceSale;
        balance.totalProductPriceBuy = totalProductPriceBuy;
        balance.balanceProduct = balanceProduct;

        await manager.save(balance);
      });
    }
  }
}
