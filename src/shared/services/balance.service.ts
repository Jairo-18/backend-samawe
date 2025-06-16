import { ProductRepository } from './../repositories/product.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { BalanceRepository } from './../repositories/balance.repository';
import { Invoice } from './../entities/invoice.entity';
import { BalanceType } from '../constants/balanceType.constants';
import { MoreThanOrEqual } from 'typeorm';

import { Balance } from '../entities/balance.entity';
import { InvoiceRepository } from '../repositories/invoice.repository';

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

  // Método para recalcular el balance completo de un período
  private async recalculateBalanceForPeriod(
    type: BalanceType,
    periodDate: Date,
  ): Promise<void> {
    const periodEndDate = this.getPeriodEndDate(type, periodDate);

    await this._balanceRepository.manager.transaction(async (manager) => {
      // Obtener todas las facturas del período
      const invoices = await this._invoiceRepository.find({
        where: {
          createdAt: MoreThanOrEqual(periodDate),
        },
        relations: ['invoiceType'],
      });

      // Filtrar las facturas que están dentro del período
      const filteredInvoices = invoices.filter(
        (invoice) =>
          invoice.createdAt >= periodDate && invoice.createdAt < periodEndDate,
      );

      // Calcular totales
      let totalInvoiceSale = 0;
      let totalInvoiceBuy = 0;

      for (const invoice of filteredInvoices) {
        const amount = Number(invoice.total) || 0;
        const isSale = invoice.invoiceType.code === 'FV';

        if (isSale) {
          totalInvoiceSale += amount;
        } else {
          totalInvoiceBuy += amount;
        }
      }

      // Buscar o crear el balance
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

      // Actualizar con los valores recalculados
      balance.totalInvoiceSale = totalInvoiceSale;
      balance.totalInvoiceBuy = totalInvoiceBuy;
      balance.balanceInvoice = totalInvoiceSale - totalInvoiceBuy;

      await manager.save(balance);
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

    // Recalcular el balance para todos los períodos que incluyen esta factura
    for (const type of Object.values(BalanceType)) {
      const periodDate = this.getPeriodDateFromDate(type, invoiceDate);
      await this.recalculateBalanceForPeriod(type, periodDate);
    }
  }

  async removeInvoiceFromBalance(invoice: Invoice): Promise<void> {
    const invoiceDate = new Date(invoice.createdAt);

    // Recalcular el balance para todos los períodos que incluían esta factura
    for (const type of Object.values(BalanceType)) {
      const periodDate = this.getPeriodDateFromDate(type, invoiceDate);
      await this.recalculateBalanceForPeriod(type, periodDate);
    }
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
