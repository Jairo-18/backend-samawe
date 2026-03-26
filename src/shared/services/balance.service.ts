import { Injectable, NotFoundException } from '@nestjs/common';
import { Between, IsNull } from 'typeorm';
import { ProductRepository } from './../repositories/product.repository';
import { BalanceRepository } from './../repositories/balance.repository';
import { InvoiceRepository } from './../repositories/invoice.repository';
import { Invoice } from './../entities/invoice.entity';
import { Balance } from '../entities/balance.entity';
import { BalanceType } from '../constants/balanceType.constants';

@Injectable()
export class BalanceService {
  constructor(
    private readonly _balanceRepository: BalanceRepository,
    private readonly _productRepository: ProductRepository,
    private readonly _invoiceRepository: InvoiceRepository,
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

  private async recalculateBalanceForPeriod(
    type: BalanceType,
    periodDate: Date,
  ): Promise<void> {
    const periodEndDate = this.getPeriodEndDate(type, periodDate);

    await this._balanceRepository.manager.transaction(async (manager) => {
      const invoices = await this._invoiceRepository.find({
        where: {
          createdAt: Between(periodDate, periodEndDate),
          deletedAt: IsNull(),
        },
        relations: ['invoiceType', 'organizational'],
      });

      const totalsByOrg = new Map<
        string,
        { totalInvoiceSale: number; totalInvoiceBuy: number }
      >();

      for (const invoice of invoices) {
        const orgId = invoice.organizational?.organizationalId || 'global';
        const amount = Number(invoice.total) || 0;
        const invoiceTypeCode = invoice.invoiceType?.code;

        if (!totalsByOrg.has(orgId)) {
          totalsByOrg.set(orgId, { totalInvoiceSale: 0, totalInvoiceBuy: 0 });
        }
        const orgTotals = totalsByOrg.get(orgId)!;

        if (invoiceTypeCode === 'FV') {
          orgTotals.totalInvoiceSale += amount;
        } else if (invoiceTypeCode === 'FC') {
          orgTotals.totalInvoiceBuy += amount;
        }
      }

      const today = this.getTodayDate();
      const isCurrentPeriod =
        this.getPeriodDateFromDate(type, today).getTime() ===
        periodDate.getTime();

      let productTotalsByOrg: Map<
        string,
        { totalProductPriceSale: number; totalProductPriceBuy: number }
      > | null = null;

      if (isCurrentPeriod) {
        productTotalsByOrg = await this.getProductTotals();
      }

      const allOrgIds = new Set<string>([...totalsByOrg.keys()]);
      if (productTotalsByOrg) {
        for (const orgId of productTotalsByOrg.keys()) {
          allOrgIds.add(orgId);
        }
      }

      for (const orgId of allOrgIds) {
        let balance = await manager.findOne(Balance, {
          where: {
            type,
            periodDate,
            organizational:
              orgId === 'global' ? IsNull() : { organizationalId: orgId },
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!balance) {
          balance = manager.create(Balance, {
            type,
            periodDate,
            organizational:
              orgId === 'global' ? undefined : { organizationalId: orgId },
          });
        }

        const invoiceTotals = totalsByOrg.get(orgId) || {
          totalInvoiceSale: 0,
          totalInvoiceBuy: 0,
        };
        balance.totalInvoiceSale = invoiceTotals.totalInvoiceSale;
        balance.totalInvoiceBuy = invoiceTotals.totalInvoiceBuy;
        balance.balanceInvoice =
          invoiceTotals.totalInvoiceSale - invoiceTotals.totalInvoiceBuy;

        if (isCurrentPeriod && productTotalsByOrg) {
          const productTotals = productTotalsByOrg.get(orgId) || {
            totalProductPriceSale: 0,
            totalProductPriceBuy: 0,
          };
          balance.totalProductPriceSale = productTotals.totalProductPriceSale;
          balance.totalProductPriceBuy = productTotals.totalProductPriceBuy;
          balance.balanceProduct =
            productTotals.totalProductPriceSale -
            productTotals.totalProductPriceBuy;
        }

        await manager.save(balance);
      }
    });
  }

  async updateBalanceByInvoiceId(invoiceId: number): Promise<void> {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: ['invoiceType'],
    });

    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    const invoiceDate = new Date(invoice.createdAt);
    for (const type of Object.values(BalanceType)) {
      const periodDate = this.getPeriodDateFromDate(type, invoiceDate);
      await this.recalculateBalanceForPeriod(type, periodDate);
    }
    await this.recalculateAllBalances();
  }

  async removeInvoiceFromBalance(invoice: Invoice): Promise<void> {
    const invoiceDate = new Date(invoice.createdAt);
    for (const type of Object.values(BalanceType)) {
      const periodDate = this.getPeriodDateFromDate(type, invoiceDate);
      await this.recalculateBalanceForPeriod(type, periodDate);
    }
  }

  private async getProductTotals(): Promise<
    Map<string, { totalProductPriceSale: number; totalProductPriceBuy: number }>
  > {
    const products = await this._productRepository.find({
      where: { isActive: true },
      relations: ['organizational'],
    });
    const totals = new Map<
      string,
      { totalProductPriceSale: number; totalProductPriceBuy: number }
    >();

    for (const product of products) {
      const orgId = product.organizational?.organizationalId || 'global';
      const amount = Number(product.amount ?? 0);
      const priceSale = Number(product.priceSale ?? 0);
      const priceBuy = Number(product.priceBuy ?? 0);

      if (amount <= 0 || priceSale <= 0 || priceBuy <= 0) continue;

      const sale = amount * priceSale;
      const buy = amount * priceBuy;

      if (!totals.has(orgId)) {
        totals.set(orgId, {
          totalProductPriceSale: 0,
          totalProductPriceBuy: 0,
        });
      }

      const orgTotals = totals.get(orgId)!;
      orgTotals.totalProductPriceSale += sale;
      orgTotals.totalProductPriceBuy += buy;
    }

    return totals;
  }

  async updateBalanceWithCurrentProducts(): Promise<void> {
    const productTotalsByOrg = await this.getProductTotals();
    const today = this.getTodayDate();

    for (const type of Object.values(BalanceType)) {
      const periodDate = this.getPeriodDateFromDate(type, today);

      await this._balanceRepository.manager.transaction(async (manager) => {
        for (const [orgId, totals] of productTotalsByOrg.entries()) {
          const balanceProduct =
            totals.totalProductPriceSale - totals.totalProductPriceBuy;

          let balance = await manager.findOne(Balance, {
            where: {
              type,
              periodDate,
              organizational:
                orgId === 'global' ? IsNull() : { organizationalId: orgId },
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (!balance) {
            balance = manager.create(Balance, {
              type,
              periodDate,
              organizational:
                orgId === 'global' ? undefined : { organizationalId: orgId },
            });
          }

          balance.totalProductPriceSale = totals.totalProductPriceSale;
          balance.totalProductPriceBuy = totals.totalProductPriceBuy;
          balance.balanceProduct = balanceProduct;

          await manager.save(balance);
        }
      });
    }
  }

  async recalculateAllBalances(): Promise<void> {
    const firstInvoice = await this._invoiceRepository
      .createQueryBuilder('invoice')
      .orderBy('invoice.createdAt', 'ASC')
      .getOne();

    const lastInvoice = await this._invoiceRepository
      .createQueryBuilder('invoice')
      .orderBy('invoice.createdAt', 'DESC')
      .getOne();

    if (!firstInvoice || !lastInvoice) return;

    const startDate = new Date(firstInvoice.createdAt);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(lastInvoice.createdAt);
    endDate.setHours(0, 0, 0, 0);

    const currentDaily = new Date(startDate);
    while (currentDaily <= endDate) {
      await this.recalculateBalanceForPeriod(
        BalanceType.DAILY,
        new Date(currentDaily),
      );
      currentDaily.setDate(currentDaily.getDate() + 1);
    }

    const currentWeekly = this.getPeriodDateFromDate(
      BalanceType.WEEKLY,
      startDate,
    );
    const weeklyEnd = this.getPeriodDateFromDate(BalanceType.WEEKLY, endDate);
    while (currentWeekly <= weeklyEnd) {
      await this.recalculateBalanceForPeriod(
        BalanceType.WEEKLY,
        new Date(currentWeekly),
      );
      currentWeekly.setDate(currentWeekly.getDate() + 7);
    }

    const currentMonthly = this.getPeriodDateFromDate(
      BalanceType.MONTHLY,
      startDate,
    );
    const monthlyEnd = this.getPeriodDateFromDate(BalanceType.MONTHLY, endDate);
    while (currentMonthly <= monthlyEnd) {
      await this.recalculateBalanceForPeriod(
        BalanceType.MONTHLY,
        new Date(currentMonthly),
      );
      currentMonthly.setMonth(currentMonthly.getMonth() + 1);
    }

    const currentYearly = this.getPeriodDateFromDate(
      BalanceType.YEARLY,
      startDate,
    );
    const yearlyEnd = this.getPeriodDateFromDate(BalanceType.YEARLY, endDate);
    while (currentYearly <= yearlyEnd) {
      await this.recalculateBalanceForPeriod(
        BalanceType.YEARLY,
        new Date(currentYearly),
      );
      currentYearly.setFullYear(currentYearly.getFullYear() + 1);
    }
  }
}
