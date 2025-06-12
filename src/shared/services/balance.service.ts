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

  private getPeriodDate(type: BalanceType): Date {
    const now = new Date();
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        type === BalanceType.MONTHLY || type === BalanceType.YEARLY
          ? 1
          : type === BalanceType.WEEKLY
            ? now.getUTCDate() -
              now.getUTCDay() +
              (now.getUTCDay() === 0 ? -6 : 1)
            : now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }

  private getPeriodDateFromDate(type: BalanceType, date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);

    switch (type) {
      case BalanceType.WEEKLY:
        const day = d.getUTCDay();
        d.setUTCDate(d.getUTCDate() - day + (day === 0 ? -6 : 1));
        break;
      case BalanceType.MONTHLY:
        d.setUTCDate(1);
        break;
      case BalanceType.YEARLY:
        d.setUTCMonth(0);
        d.setUTCDate(1);
        break;
    }

    return d;
  }

  private getPeriodEndDate(type: BalanceType, periodDate: Date): Date {
    const endDate = new Date(periodDate);

    switch (type) {
      case BalanceType.DAILY:
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        break;
      case BalanceType.WEEKLY:
        endDate.setUTCDate(endDate.getUTCDate() + 7);
        break;
      case BalanceType.MONTHLY:
        endDate.setUTCMonth(endDate.getUTCMonth() + 1);
        break;
      case BalanceType.YEARLY:
        endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
        break;
    }

    return endDate;
  }

  private getTodayDate(): Date {
    const today = new Date();
    return new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
  }

  private async getOrCreateBalanceByType(
    type: BalanceType,
    periodDate?: Date,
  ): Promise<Balance> {
    const targetDate = periodDate || this.getPeriodDate(type);

    let balance = await this._balanceRepository.findOne({
      where: { periodDate: targetDate, type },
    });

    if (!balance) {
      balance = this._balanceRepository.create({
        type,
        periodDate: targetDate,
        totalInvoiceSale: 0,
        totalInvoiceBuy: 0,
        balanceInvoice: 0,
        totalProductPriceSale: 0,
        totalProductPriceBuy: 0,
        balanceProduct: 0,
      });
    }

    return balance;
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

        if (!balance) {
          balance = manager.create(Balance, {
            type,
            periodDate,
            totalInvoiceSale: 0,
            totalInvoiceBuy: 0,
            balanceInvoice: 0,
            totalProductPriceSale: 0,
            totalProductPriceBuy: 0,
            balanceProduct: 0,
          });
        }

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
      const amount = Number(product.amount) || 0;
      totalProductPriceSale += amount * (Number(product.priceSale) || 0);
      totalProductPriceBuy += amount * (Number(product.priceBuy) || 0);
    }

    const balanceProduct = totalProductPriceSale - totalProductPriceBuy;

    for (const type of Object.values(BalanceType)) {
      const today = this.getTodayDate();
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
            totalInvoiceSale: 0,
            totalInvoiceBuy: 0,
            balanceInvoice: 0,
            totalProductPriceSale: 0,
            totalProductPriceBuy: 0,
            balanceProduct: 0,
          });
        }

        balance.totalProductPriceSale = totalProductPriceSale;
        balance.totalProductPriceBuy = totalProductPriceBuy;
        balance.balanceProduct = balanceProduct;

        await manager.save(balance);
      });
    }
  }

  async recalculateAllInvoiceBalances(): Promise<void> {
    const invoices = await this._balanceRepository.manager.find(Invoice, {
      relations: ['invoiceType'],
    });

    const balanceMap = new Map<string, Balance>();

    for (const invoice of invoices) {
      const isSale = invoice.invoiceType.code === 'FV';
      const amount = Number(invoice.total) || 0;
      const invoiceDate = new Date(invoice.createdAt);

      for (const type of Object.values(BalanceType)) {
        const periodDate = this.getPeriodDateFromDate(type, invoiceDate);
        const key = `${type}_${periodDate.toISOString().split('T')[0]}`;

        if (!balanceMap.has(key)) {
          balanceMap.set(key, {
            type,
            periodDate,
            totalInvoiceSale: 0,
            totalInvoiceBuy: 0,
            balanceInvoice: 0,
            totalProductPriceSale: 0,
            totalProductPriceBuy: 0,
            balanceProduct: 0,
          } as Balance);
        }

        const balance = balanceMap.get(key)!;
        if (isSale) balance.totalInvoiceSale += amount;
        else balance.totalInvoiceBuy += amount;
        balance.balanceInvoice =
          balance.totalInvoiceSale - balance.totalInvoiceBuy;
      }
    }

    await this._balanceRepository.clear();
    await this._balanceRepository.save([...balanceMap.values()]);
  }

  async verifyBalances(): Promise<{ isConsistent: boolean; message: string }> {
    try {
      const tempBalances = new Map<string, Balance>();
      const invoices = await this._balanceRepository.manager.find(Invoice, {
        relations: ['invoiceType'],
      });

      for (const invoice of invoices) {
        const isSale = invoice.invoiceType.code === 'FV';
        const amount = Number(invoice.total) || 0;
        const invoiceDate = new Date(invoice.createdAt);

        for (const type of Object.values(BalanceType)) {
          const periodDate = this.getPeriodDateFromDate(type, invoiceDate);
          const key = `${type}_${periodDate.toISOString().split('T')[0]}`;

          if (!tempBalances.has(key)) {
            tempBalances.set(key, {
              type,
              periodDate,
              totalInvoiceSale: 0,
              totalInvoiceBuy: 0,
              balanceInvoice: 0,
            } as Balance);
          }

          const balance = tempBalances.get(key)!;
          if (isSale) balance.totalInvoiceSale += amount;
          else balance.totalInvoiceBuy += amount;

          balance.balanceInvoice =
            balance.totalInvoiceSale - balance.totalInvoiceBuy;
        }
      }

      const storedBalances = await this._balanceRepository.find();
      let inconsistencies = 0;

      for (const stored of storedBalances) {
        const key = `${stored.type}_${stored.periodDate.toISOString().split('T')[0]}`;
        const calculated = tempBalances.get(key);

        if (
          !calculated ||
          stored.totalInvoiceSale !== calculated.totalInvoiceSale ||
          stored.totalInvoiceBuy !== calculated.totalInvoiceBuy
        ) {
          inconsistencies++;
        }
      }

      return inconsistencies > 0
        ? {
            isConsistent: false,
            message: `Found ${inconsistencies} inconsistencies in balances`,
          }
        : { isConsistent: true, message: 'All balances are consistent' };
    } catch (error) {
      throw error;
    }
  }

  async getBalanceSummary(): Promise<{
    daily: Balance[];
    weekly: Balance[];
    monthly: Balance[];
    yearly: Balance[];
    total: {
      invoiceSale: number;
      invoiceBuy: number;
      balanceInvoice: number;
      productSale: number;
      productBuy: number;
      balanceProduct: number;
    };
  }> {
    const allBalances = await this._balanceRepository.find();

    const grouped = {
      daily: allBalances.filter((b) => b.type === BalanceType.DAILY),
      weekly: allBalances.filter((b) => b.type === BalanceType.WEEKLY),
      monthly: allBalances.filter((b) => b.type === BalanceType.MONTHLY),
      yearly: allBalances.filter((b) => b.type === BalanceType.YEARLY),
    };

    const total = allBalances.reduce(
      (acc, b) => {
        acc.invoiceSale += b.totalInvoiceSale;
        acc.invoiceBuy += b.totalInvoiceBuy;
        acc.balanceInvoice += b.balanceInvoice;
        acc.productSale += b.totalProductPriceSale;
        acc.productBuy += b.totalProductPriceBuy;
        acc.balanceProduct += b.balanceProduct;
        return acc;
      },
      {
        invoiceSale: 0,
        invoiceBuy: 0,
        balanceInvoice: 0,
        productSale: 0,
        productBuy: 0,
        balanceProduct: 0,
      },
    );

    return { ...grouped, total };
  }
}
