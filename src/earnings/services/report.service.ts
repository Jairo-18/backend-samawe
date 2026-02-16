import { PayTypeRepository } from './../../shared/repositories/payType.repository';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { Injectable } from '@nestjs/common';
import {
  PaymentTypeReport,
  CategoryDetailReport,
} from '../interfaces/report.interface';
import { CATEGORY_TYPES, PAYMENT_TYPES } from '../constants/report.constants';
import { CategoryReportDto } from '../dtos/report.dto';

@Injectable()
export class ReportService {
  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _payTypeRepository: PayTypeRepository,
  ) {}

  private getColombianDateTime(): Date {
    const now = new Date();
    const colombianOffset = -5 * 60;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + colombianOffset * 60000);
  }

  private calculateDateRanges(now: Date) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(startOfWeek.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    return {
      daily: { start: startOfToday, end: endOfToday },
      weekly: { start: startOfWeek, end: endOfWeek },
      monthly: { start: startOfMonth, end: endOfMonth },
      yearly: { start: startOfYear, end: endOfYear },
    };
  }

  async generateAllPaymentTypesReport(): Promise<PaymentTypeReport[]> {
    const now = this.getColombianDateTime();
    const dateRanges = this.calculateDateRanges(now);

    const reports = await Promise.all(
      PAYMENT_TYPES.map(async (paymentTypeName) => {
        const query = async (startDate: Date, endDate: Date) => {
          return await this._invoiceRepository
            .createQueryBuilder('invoice')
            .leftJoin('invoice.payType', 'payType')
            .leftJoin('invoice.paidType', 'paidType')
            .select([
              'COUNT(*) as count',
              'COALESCE(SUM(invoice.total), 0) as total',
            ])
            .where('payType.name = :paymentTypeName', { paymentTypeName })
            .andWhere('paidType.name IN (:...paidTypes)', {
              paidTypes: ['PAGADO', 'RESERVADO - PAGADO'],
            })
            .andWhere(
              'invoice.createdAt >= :startDate AND invoice.createdAt <= :endDate',
              { startDate, endDate },
            )
            .getRawOne();
        };

        const [daily, weekly, monthly, yearly] = await Promise.all([
          query(dateRanges.daily.start, dateRanges.daily.end),
          query(dateRanges.weekly.start, dateRanges.weekly.end),
          query(dateRanges.monthly.start, dateRanges.monthly.end),
          query(dateRanges.yearly.start, dateRanges.yearly.end),
        ]);

        return {
          paymentType: paymentTypeName,
          dailyCount: parseInt(daily?.count) || 0,
          weeklyCount: parseInt(weekly?.count) || 0,
          monthlyCount: parseInt(monthly?.count) || 0,
          yearlyCount: parseInt(yearly?.count) || 0,
          dailyTotal: parseFloat(daily?.total) || 0,
          weeklyTotal: parseFloat(weekly?.total) || 0,
          monthlyTotal: parseFloat(monthly?.total) || 0,
          yearlyTotal: parseFloat(yearly?.total) || 0,
        };
      }),
    );

    return reports;
  }

  async generateSalesByCategoryReport(): Promise<CategoryReportDto[]> {
    const now = this.getColombianDateTime();
    const dateRanges = this.calculateDateRanges(now);

    const reports = await Promise.all(
      CATEGORY_TYPES.map(async (categoryName) => {
        const query = async (startDate: Date, endDate: Date) => {
          const qb = this._invoiceRepository
            .createQueryBuilder('invoice')
            .leftJoin('invoice.invoiceDetails', 'detail')
            .leftJoin('detail.product', 'product')
            .leftJoin('product.categoryType', 'categoryType')
            .leftJoin('detail.accommodation', 'accommodation')
            .leftJoin('detail.excursion', 'excursion')
            .leftJoin('excursion.categoryType', 'excursionCategoryType')
            .select([
              'COUNT(detail.invoiceDetailId) as count',
              'COALESCE(SUM(detail.subtotal), 0) as total',
            ])
            .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
              startDate,
              endDate,
            });

          if (categoryName === 'HOSPEDAJE') {
            qb.andWhere('accommodation.accommodationId IS NOT NULL');
          } else if (['PASADIA', 'SERVICIOS'].includes(categoryName)) {
            // Excursiones con categoría específica
            qb.andWhere('excursion.excursionId IS NOT NULL');
            qb.andWhere('excursionCategoryType.name = :categoryName', {
              categoryName,
            });
          } else if (
            ['BAR', 'RESTAURANTE', 'OTROS', 'MECATO'].includes(categoryName)
          ) {
            // Productos con categoría específica
            qb.andWhere('product.productId IS NOT NULL');
            qb.andWhere('categoryType.name = :categoryName', { categoryName });
          }

          return qb.getRawOne();
        };

        const [daily, weekly, monthly, yearly] = await Promise.all([
          query(dateRanges.daily.start, dateRanges.daily.end),
          query(dateRanges.weekly.start, dateRanges.weekly.end),
          query(dateRanges.monthly.start, dateRanges.monthly.end),
          query(dateRanges.yearly.start, dateRanges.yearly.end),
        ]);

        return {
          category: categoryName,
          dailyCount: parseInt(daily?.count) || 0,
          weeklyCount: parseInt(weekly?.count) || 0,
          monthlyCount: parseInt(monthly?.count) || 0,
          yearlyCount: parseInt(yearly?.count) || 0,
          dailyTotal: parseFloat(daily?.total) || 0,
          weeklyTotal: parseFloat(weekly?.total) || 0,
          monthlyTotal: parseFloat(monthly?.total) || 0,
          yearlyTotal: parseFloat(yearly?.total) || 0,
        };
      }),
    );

    return reports;
  }

  async generateSalesByCategoryWithDetails(): Promise<CategoryDetailReport[]> {
    const now = this.getColombianDateTime();
    const dateRanges = this.calculateDateRanges(now);

    const reports = await Promise.all(
      CATEGORY_TYPES.map(async (categoryName) => {
        const queryDetails = async (
          startDate: Date,
          endDate: Date,
          period: string,
        ) => {
          const qb = this._invoiceRepository
            .createQueryBuilder('invoice')
            .leftJoin('invoice.invoiceDetails', 'detail')
            .leftJoin('detail.product', 'product')
            .leftJoin('product.categoryType', 'categoryType')
            .leftJoin('detail.accommodation', 'accommodation')
            .leftJoin('detail.excursion', 'excursion')
            .leftJoin('excursion.categoryType', 'excursionCategoryType')
            .select([
              'detail.invoiceDetailId as invoiceDetailId',
              'detail.subtotal as subtotal',
              'detail.amount as amount',
              'invoice.invoiceId as invoiceId',
              'invoice.createdAt as invoiceDate',
              'CASE WHEN product.productId IS NOT NULL THEN product.name ELSE NULL END as productName',
              'CASE WHEN accommodation.accommodationId IS NOT NULL THEN accommodation.name ELSE NULL END as accommodationName',
              'CASE WHEN excursion.excursionId IS NOT NULL THEN excursion.name ELSE NULL END as excursionName',
              `CASE
                WHEN product.productId IS NOT NULL THEN 'PRODUCT'
                WHEN accommodation.accommodationId IS NOT NULL THEN 'ACCOMMODATION'
                WHEN excursion.excursionId IS NOT NULL THEN 'EXCURSION'
                ELSE 'UNKNOWN'
              END as itemType`,
            ])
            .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
              startDate,
              endDate,
            });

          if (categoryName === 'HOSPEDAJE') {
            qb.andWhere('accommodation.accommodationId IS NOT NULL');
          } else if (['PASADIA', 'SERVICIOS'].includes(categoryName)) {
            // Excursiones con categoría específica
            qb.andWhere('excursion.excursionId IS NOT NULL');
            qb.andWhere('excursionCategoryType.name = :categoryName', {
              categoryName,
            });
          } else if (
            ['BAR', 'RESTAURANTE', 'OTROS', 'MECATO'].includes(categoryName)
          ) {
            // Productos con categoría específica
            qb.andWhere('product.productId IS NOT NULL');
            qb.andWhere('categoryType.name = :categoryName', { categoryName });
          }
          const results = await qb.getRawMany();

          return results.map((item) => ({
            invoiceDetailId: parseInt(item.invoicedetailid),
            invoiceId: parseInt(item.invoiceid),
            invoiceDate: item.invoicedate,
            subtotal: parseFloat(item.subtotal),
            amount: parseFloat(item.amount),
            itemType: item.itemtype,
            itemName:
              item.productname ||
              item.accommodationname ||
              item.excursionname ||
              'Sin nombre',
            period: period,
          }));
        };

        const [dailyDetails, weeklyDetails, monthlyDetails, yearlyDetails] =
          await Promise.all([
            queryDetails(dateRanges.daily.start, dateRanges.daily.end, 'DAILY'),
            queryDetails(
              dateRanges.weekly.start,
              dateRanges.weekly.end,
              'WEEKLY',
            ),
            queryDetails(
              dateRanges.monthly.start,
              dateRanges.monthly.end,
              'MONTHLY',
            ),
            queryDetails(
              dateRanges.yearly.start,
              dateRanges.yearly.end,
              'YEARLY',
            ),
          ]);

        const dailyTotal = dailyDetails.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );
        const weeklyTotal = weeklyDetails.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );
        const monthlyTotal = monthlyDetails.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );
        const yearlyTotal = yearlyDetails.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );

        return {
          category: categoryName,
          summary: {
            dailyCount: dailyDetails.length,
            weeklyCount: weeklyDetails.length,
            monthlyCount: monthlyDetails.length,
            yearlyCount: yearlyDetails.length,
            dailyTotal: dailyTotal,
            weeklyTotal: weeklyTotal,
            monthlyTotal: monthlyTotal,
            yearlyTotal: yearlyTotal,
          },
          details: {
            daily: dailyDetails,
            weekly: weeklyDetails,
            monthly: monthlyDetails,
            yearly: yearlyDetails,
          },
        };
      }),
    );

    return reports;
  }

  async getCategoryDetailsForPeriod(
    categoryName: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  ) {
    const now = this.getColombianDateTime();
    const dateRanges = this.calculateDateRanges(now);
    const selectedRange = dateRanges[period];

    const qb = this._invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.invoiceDetails', 'detail')
      .leftJoin('detail.product', 'product')
      .leftJoin('product.categoryType', 'categoryType')
      .leftJoin('detail.accommodation', 'accommodation')
      .leftJoin('detail.excursion', 'excursion')
      .leftJoin('excursion.categoryType', 'excursionCategoryType')
      .select([
        'detail.invoiceDetailId as invoiceDetailId',
        'detail.subtotal as subtotal',
        'detail.amount as amount',
        'invoice.invoiceId as invoiceId',
        'invoice.createdAt as invoiceDate',
        'CASE WHEN product.productId IS NOT NULL THEN product.name ELSE NULL END as productName',
        'CASE WHEN accommodation.accommodationId IS NOT NULL THEN accommodation.name ELSE NULL END as accommodationName',
        'CASE WHEN excursion.excursionId IS NOT NULL THEN excursion.name ELSE NULL END as excursionName',
        `CASE
          WHEN product.productId IS NOT NULL THEN 'PRODUCT'
          WHEN accommodation.accommodationId IS NOT NULL THEN 'ACCOMMODATION'
          WHEN excursion.excursionId IS NOT NULL THEN 'EXCURSION'
          ELSE 'UNKNOWN'
        END as itemType`,
      ])
      .where('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate: selectedRange.start,
        endDate: selectedRange.end,
      });

    if (categoryName === 'HOSPEDAJE') {
      qb.andWhere('accommodation.accommodationId IS NOT NULL');
    } else if (['PASADIA', 'SERVICIOS'].includes(categoryName)) {
      // Excursiones con categoría específica
      qb.andWhere('excursion.excursionId IS NOT NULL');
      qb.andWhere('excursionCategoryType.name = :categoryName', {
        categoryName,
      });
    } else if (
      ['BAR', 'RESTAURANTE', 'OTROS', 'MECATO'].includes(categoryName)
    ) {
      // Productos con categoría específica
      qb.andWhere('product.productId IS NOT NULL');
      qb.andWhere('categoryType.name = :categoryName', { categoryName });
    }
    const results = await qb.getRawMany();

    return results.map((item) => ({
      invoiceDetailId: parseInt(item.invoicedetailid),
      invoiceId: parseInt(item.invoiceid),
      invoiceDate: item.invoicedate,
      subtotal: parseFloat(item.subtotal),
      amount: parseFloat(item.amount),
      itemType: item.itemtype,
      itemName:
        item.productname ||
        item.accommodationname ||
        item.excursionname ||
        'Sin nombre',
    }));
  }
}
