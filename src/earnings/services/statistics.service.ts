import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly _productRepository: ProductRepository,
    private readonly _accommodationRepository: AccommodationRepository,
    private readonly _excursionRepository: ExcursionRepository,
    private readonly _invoiceDetailRepository: InvoiceDetaillRepository,
  ) {}

  async countActiveInactiveProducts(organizationalId?: string) {
    const query = this._productRepository
      .createQueryBuilder('product')
      .select('product.isActive', 'isActive')
      .addSelect('COUNT(*)', 'count')
      .groupBy('product.isActive');

    if (organizationalId) {
      query.where('product.organizationalId = :organizationalId', {
        organizationalId,
      });
    } else {
      query.where('product.organizationalId IS NULL');
    }

    return await query.getRawMany();
  }

  async countAccommodationsByState(organizationalId?: string) {
    const query = this._accommodationRepository
      .createQueryBuilder('accommodation')
      .leftJoin('accommodation.stateType', 'stateType')
      .select(`"stateType"."name"->>'es'`, 'state')
      .addSelect('COUNT(*)', 'count')
      .where(`"stateType"."name"->>'es' IN (:...names)`, {
        names: [
          'Disponible',
          'Mantenimiento',
          'Fuera de Servicio',
          'Ocupado',
          'Reservado',
        ],
      })
      .groupBy(`"stateType"."name"->>'es'`);

    if (organizationalId) {
      query.andWhere('accommodation.organizationalId = :organizationalId', {
        organizationalId,
      });
    } else {
      query.andWhere('accommodation.organizationalId IS NULL');
    }

    return await query.getRawMany();
  }

  async countExcursionsByState(organizationalId?: string) {
    const query = this._excursionRepository
      .createQueryBuilder('excursion')
      .leftJoin('excursion.stateType', 'stateType')
      .select(`"stateType"."name"->>'es'`, 'state')
      .addSelect('COUNT(*)', 'count')
      .where(`"stateType"."name"->>'es' IN (:...names)`, {
        names: ['Disponible', 'Mantenimiento', 'Fuera de Servicio', 'Ocupado', 'Reservado'],
      })
      .groupBy(`"stateType"."name"->>'es'`);

    if (organizationalId) {
      query.andWhere('excursion.organizationalId = :organizationalId', {
        organizationalId,
      });
    } else {
      query.andWhere('excursion.organizationalId IS NULL');
    }

    return await query.getRawMany();
  }

  async getReservedAccommodationsWithInvoices(organizationalId?: string) {
    const query = this._invoiceDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.invoice', 'invoice')
      .leftJoin('invoice.paidType', 'paidType')
      .select([
        'DISTINCT detail.accommodationId AS "accommodationId"',
        'invoice.invoiceId AS "invoiceId"',
      ])
      .where('detail.accommodationId IS NOT NULL')
      .andWhere(`"paidType"."name"->>'es' IN (:...names)`, {
        names: ['Reservado - Pagado', 'Reservado - Pendiente'],
      });

    if (organizationalId) {
      query.andWhere('invoice.organizationalId = :organizationalId', {
        organizationalId,
      });
    } else {
      query.andWhere('invoice.organizationalId IS NULL');
    }

    return await query.getRawMany();
  }

  /**
   * Obtiene estadísticas diarias de ventas (solo del día actual)
   * @returns Totales de productos, hospedajes y excursiones vendidos hoy
   */
  async getDailySalesStatistics(organizationalId?: string) {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    const query = this._invoiceDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.invoice', 'invoice')
      .leftJoin('invoice.invoiceType', 'invoiceType')
      .leftJoin('detail.product', 'product')
      .leftJoin('detail.accommodation', 'accommodation')
      .leftJoin('detail.excursion', 'excursion')
      .select([
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsSold"',
        'COALESCE(SUM(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalAccommodationsSold"',
        'COALESCE(SUM(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalExcursionsSold"',
        'COALESCE(SUM(CASE WHEN invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalSales"',
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsPurchased"',
        'COALESCE(SUM(CASE WHEN invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalPurchases"',
        'COUNT(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countProducts"',
        'COUNT(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countAccommodations"',
        'COUNT(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countExcursions"',
        'COUNT(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FC\' THEN 1 END) AS "countProductsPurchased"',
      ])
      .where('invoice.createdAt >= :startOfDay', { startOfDay })
      .andWhere('invoice.createdAt < :endOfDay', { endOfDay });

    if (organizationalId) {
      query.andWhere('invoice.organizationalId = :organizationalId', {
        organizationalId,
      });
    } else {
      query.andWhere('invoice.organizationalId IS NULL');
    }

    return await query.getRawOne();
  }

  /**
   * Obtiene estadísticas diarias de ventas y compras para una fecha específica
   * @param date Fecha específica (formato: YYYY-MM-DD o Date object)
   * @returns Totales de productos, hospedajes y excursiones vendidos/comprados en esa fecha
   */
  async getDailySalesStatisticsByDate(
    date: string | Date,
    organizationalId?: string,
  ) {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate() + 1,
    );

    const query = this._invoiceDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.invoice', 'invoice')
      .leftJoin('invoice.invoiceType', 'invoiceType')
      .leftJoin('detail.product', 'product')
      .leftJoin('detail.accommodation', 'accommodation')
      .leftJoin('detail.excursion', 'excursion')
      .select([
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsSold"',
        'COALESCE(SUM(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalAccommodationsSold"',
        'COALESCE(SUM(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalExcursionsSold"',
        'COALESCE(SUM(CASE WHEN invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalSales"',
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsPurchased"',
        'COALESCE(SUM(CASE WHEN invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalPurchases"',
        'COUNT(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countProducts"',
        'COUNT(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countAccommodations"',
        'COUNT(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countExcursions"',
        'COUNT(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FC\' THEN 1 END) AS "countProductsPurchased"',
      ])
      .where('invoice.createdAt >= :startOfDay', { startOfDay })
      .andWhere('invoice.createdAt < :endOfDay', { endOfDay });

    if (organizationalId) {
      query.andWhere('invoice.organizationalId = :organizationalId', {
        organizationalId,
      });
    } else {
      query.andWhere('invoice.organizationalId IS NULL');
    }

    return await query.getRawOne();
  }

  async getGeneralStatistics(organizationalId?: string) {
    const [
      products,
      accommodations,
      excursions,
      reservedAccommodations,
      dailySales,
    ] = await Promise.all([
      this.countActiveInactiveProducts(organizationalId),
      this.countAccommodationsByState(organizationalId),
      this.countExcursionsByState(organizationalId),
      this.getReservedAccommodationsWithInvoices(organizationalId),
      this.getDailySalesStatistics(organizationalId),
    ]);

    return {
      products,
      accommodations,
      excursions,
      reservedAccommodations,
      dailySales,
    };
  }
}
