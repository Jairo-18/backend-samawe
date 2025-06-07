import {
  InventoryTotalDto,
  CountAndTotalItemsDto,
  SoldStatsItemTypeDto,
  TotalWithProducts,
} from './../dtos/earning.dto';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { Injectable } from '@nestjs/common';
import { InvoiceTotalsDto } from '../dtos/earning.dto';
import dayjs from 'dayjs';

@Injectable()
export class EarningService {
  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _productRepository: ProductRepository,
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
  ) {}

  async getInvoiceTotalsOnly(): Promise<InvoiceTotalsDto> {
    const now = dayjs();
    const periods = {
      day: now.startOf('day').toDate(),
      week: now.startOf('week').toDate(),
      month: now.startOf('month').toDate(),
      year: now.startOf('year').toDate(),
    };

    const ventaType = await this._invoiceRepository.manager
      .getRepository('InvoiceType')
      .findOne({ where: { name: 'Factura de Venta' } });

    const compraType = await this._invoiceRepository.manager
      .getRepository('InvoiceType')
      .findOne({ where: { name: 'Factura de Compra' } });

    if (!ventaType || !compraType) {
      throw new Error('No se encontraron los tipos de factura.');
    }

    const getSumByTypeAndPeriod = async (typeId: number, start: Date) =>
      this._invoiceRepository
        .createQueryBuilder('invoice')
        .select('COALESCE(SUM(invoice.total), 0)', 'total')
        .where('invoice.invoiceTypeId = :typeId', { typeId })
        .andWhere('invoice.createdAt >= :start', { start })
        .andWhere('invoice.deletedAt IS NULL')
        .getRawOne();

    const getSumByTypeAllTime = async (typeId: number) =>
      this._invoiceRepository
        .createQueryBuilder('invoice')
        .select('COALESCE(SUM(invoice.total), 0)', 'total')
        .where('invoice.invoiceTypeId = :typeId', { typeId })
        .andWhere('invoice.deletedAt IS NULL')
        .getRawOne();

    const invoiceSale = {
      daily: Number(
        (await getSumByTypeAndPeriod(ventaType.invoiceTypeId, periods.day))
          .total,
      ),
      weekly: Number(
        (await getSumByTypeAndPeriod(ventaType.invoiceTypeId, periods.week))
          .total,
      ),
      monthly: Number(
        (await getSumByTypeAndPeriod(ventaType.invoiceTypeId, periods.month))
          .total,
      ),
      yearly: Number(
        (await getSumByTypeAndPeriod(ventaType.invoiceTypeId, periods.year))
          .total,
      ),
      totalAllTime: Number(
        (await getSumByTypeAllTime(ventaType.invoiceTypeId)).total,
      ),
    };

    const invoiceBuy = {
      daily: Number(
        (await getSumByTypeAndPeriod(compraType.invoiceTypeId, periods.day))
          .total,
      ),
      weekly: Number(
        (await getSumByTypeAndPeriod(compraType.invoiceTypeId, periods.week))
          .total,
      ),
      monthly: Number(
        (await getSumByTypeAndPeriod(compraType.invoiceTypeId, periods.month))
          .total,
      ),
      yearly: Number(
        (await getSumByTypeAndPeriod(compraType.invoiceTypeId, periods.year))
          .total,
      ),
      totalAllTime: Number(
        (await getSumByTypeAllTime(compraType.invoiceTypeId)).total,
      ),
    };

    return { invoiceSale, invoiceBuy };
  }

  async getSoldStatsOnly(): Promise<CountAndTotalItemsDto> {
    const now = dayjs();
    const periods = {
      day: now.startOf('day').toDate(),
      week: now.startOf('week').toDate(),
      month: now.startOf('month').toDate(),
      year: now.startOf('year').toDate(),
    };

    const ventaType = await this._invoiceRepository.manager
      .getRepository('InvoiceType')
      .findOne({ where: { name: 'Factura de Venta' } });

    if (!ventaType) {
      throw new Error('Tipo de factura de venta no encontrado');
    }

    const getCountAndTotalByType = async (
      type: string,
      start: Date,
      invoiceTypeId: number,
    ): Promise<{ count: number; total: number }> => {
      let itemTypeCondition = '';
      switch (type) {
        case 'product':
          itemTypeCondition = 'detail.productId IS NOT NULL';
          break;
        case 'accommodation':
          itemTypeCondition = 'detail.accommodationId IS NOT NULL';
          break;
        case 'excursion':
          itemTypeCondition = 'detail.excursionId IS NOT NULL';
          break;
        default:
          throw new Error(`Tipo desconocido: ${type}`);
      }

      const result = await this._invoiceDetaillRepository
        .createQueryBuilder('detail')
        .innerJoin('detail.invoice', 'invoice')
        .select([
          'COUNT(detail.invoiceDetailId) AS count',
          'COALESCE(SUM(detail.priceWithTax * detail.amount), 0) AS total',
        ])
        .where(itemTypeCondition)
        .andWhere('invoice.invoiceTypeId = :invoiceTypeId', { invoiceTypeId })
        .andWhere('detail.createdAt >= :start', { start })
        .andWhere('detail.deletedAt IS NULL')
        .andWhere('invoice.deletedAt IS NULL')
        .getRawOne();

      return {
        count: Number(result.count) || 0,
        total: Number(result.total) || 0,
      };
    };

    const itemTypes = ['product', 'accommodation', 'excursion'] as const;

    const statsRaw = await Promise.all(
      itemTypes.flatMap((type) =>
        Object.values(periods).map((start) =>
          getCountAndTotalByType(type, start, ventaType.invoiceTypeId),
        ),
      ),
    );

    const buildStats = (typeIndex: number): SoldStatsItemTypeDto => ({
      daily: statsRaw[typeIndex * 4 + 0],
      weekly: statsRaw[typeIndex * 4 + 1],
      monthly: statsRaw[typeIndex * 4 + 2],
      yearly: statsRaw[typeIndex * 4 + 3],
    });

    return {
      products: buildStats(0),
      accommodations: buildStats(1),
      excursions: buildStats(2),
    };
  }

  async getInventoryOnly(): Promise<InventoryTotalDto> {
    const inventoryRaw = await this._productRepository
      .createQueryBuilder('product')
      .select(['product.amount', 'product.priceSale'])
      .where('product.deletedAt IS NULL')
      .getMany();

    const totalInventoryValue = inventoryRaw.reduce((acc, p) => {
      const amount = Number(p.amount) || 0;
      const priceSale = Number(p.priceSale) || 0;
      return acc + amount * priceSale;
    }, 0);

    return { totalInventoryValue };
  }

  async getTotalSalesPlusInventoryOnly(): Promise<TotalWithProducts> {
    const { yearly } = (await this.getInvoiceTotalsOnly()).invoiceSale;
    const inventory = await this.getInventoryOnly();
    return {
      total: yearly + inventory.totalInventoryValue,
    };
  }
}
