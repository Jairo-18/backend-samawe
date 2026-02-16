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

  async countActiveInactiveProducts() {
    return await this._productRepository
      .createQueryBuilder('product')
      .select('product.isActive', 'isActive')
      .addSelect('COUNT(*)', 'count')
      .groupBy('product.isActive')
      .getRawMany();
  }

  async countAccommodationsByState() {
    return await this._accommodationRepository
      .createQueryBuilder('accommodation')
      .leftJoin('accommodation.stateType', 'stateType')
      .select('stateType.name', 'state')
      .addSelect('COUNT(*)', 'count')
      .where('stateType.name IN (:...names)', {
        names: [
          'Disponible',
          'DISPONIBLE',
          'Mantenimiento',
          'MANTENIMIENTO',
          'Fuera de Servicio',
          'FUERA DE SERVICIO',
          'Ocupado',
          'OCUPADO',
          'Reservado',
          'RESERVADO',
        ],
      })
      .groupBy('stateType.name')
      .getRawMany();
  }

  async countExcursionsByState() {
    return await this._excursionRepository
      .createQueryBuilder('excursion')
      .leftJoin('excursion.stateType', 'stateType')
      .select('stateType.name', 'state')
      .addSelect('COUNT(*)', 'count')
      .where('stateType.name IN (:...names)', {
        names: [
          'Disponible',
          'Mantenimiento',
          'Fuera de Servicio',
          'DISPONIBLE',
          'MANTENIMIENTO',
          'FUERA DE SERVICIO',
        ],
      })
      .groupBy('stateType.name')
      .getRawMany();
  }

  async getReservedAccommodationsWithInvoices() {
    return await this._invoiceDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.invoice', 'invoice')
      .leftJoin('invoice.paidType', 'paidType')
      .select([
        'DISTINCT detail.accommodationId AS "accommodationId"',
        'invoice.invoiceId AS "invoiceId"',
      ])
      .where('detail.accommodationId IS NOT NULL')
      .andWhere('paidType.name IN (:...names)', {
        names: [
          'Reservado - Pagado',
          'Reservado - Pendiente',
          'RESERVADO - PAGADO',
          'RESERVADO - PENDIENTE',
        ],
      })
      .getRawMany();
  }

  /**
   * Obtiene estadísticas diarias de ventas (solo del día actual)
   * @returns Totales de productos, hospedajes y excursiones vendidos hoy
   */
  async getDailySalesStatistics() {
    // Obtener fecha de hoy (solo fecha, sin hora)
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

    return await this._invoiceDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.invoice', 'invoice')
      .leftJoin('invoice.invoiceType', 'invoiceType')
      .leftJoin('detail.product', 'product')
      .leftJoin('detail.accommodation', 'accommodation')
      .leftJoin('detail.excursion', 'excursion')
      .select([
        // Total de productos vendidos
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsSold"',
        // Total de hospedajes vendidos
        'COALESCE(SUM(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalAccommodationsSold"',
        // Total de excursiones vendidas (pasadías)
        'COALESCE(SUM(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalExcursionsSold"',
        // Total general de ventas
        'COALESCE(SUM(CASE WHEN invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalSales"',
        // Total de productos comprados
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsPurchased"',
        // Total general de compras
        'COALESCE(SUM(CASE WHEN invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalPurchases"',
        // Conteo de items vendidos
        'COUNT(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countProducts"',
        'COUNT(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countAccommodations"',
        'COUNT(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countExcursions"',
        // Conteo de items comprados
        'COUNT(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FC\' THEN 1 END) AS "countProductsPurchased"',
      ])
      .where('invoice.createdAt >= :startOfDay', { startOfDay })
      .andWhere('invoice.createdAt < :endOfDay', { endOfDay })
      .getRawOne();
  }

  /**
   * Obtiene estadísticas diarias de ventas y compras para una fecha específica
   * @param date Fecha específica (formato: YYYY-MM-DD o Date object)
   * @returns Totales de productos, hospedajes y excursiones vendidos/comprados en esa fecha
   */
  async getDailySalesStatisticsByDate(date: string | Date) {
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

    return await this._invoiceDetailRepository
      .createQueryBuilder('detail')
      .leftJoin('detail.invoice', 'invoice')
      .leftJoin('invoice.invoiceType', 'invoiceType')
      .leftJoin('detail.product', 'product')
      .leftJoin('detail.accommodation', 'accommodation')
      .leftJoin('detail.excursion', 'excursion')
      .select([
        // Total de productos vendidos
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsSold"',
        // Total de hospedajes vendidos
        'COALESCE(SUM(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalAccommodationsSold"',
        // Total de excursiones vendidas (pasadías)
        'COALESCE(SUM(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalExcursionsSold"',
        // Total general de ventas
        'COALESCE(SUM(CASE WHEN invoiceType.code = \'FV\' THEN detail.subtotal ELSE 0 END), 0) AS "totalSales"',
        // Total de productos comprados
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsPurchased"',
        // Total general de compras
        'COALESCE(SUM(CASE WHEN invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalPurchases"',
        // Conteo de items vendidos
        'COUNT(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countProducts"',
        'COUNT(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countAccommodations"',
        'COUNT(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code = \'FV\' THEN 1 END) AS "countExcursions"',
        // Conteo de items comprados
        'COUNT(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FC\' THEN 1 END) AS "countProductsPurchased"',
      ])
      .where('invoice.createdAt >= :startOfDay', { startOfDay })
      .andWhere('invoice.createdAt < :endOfDay', { endOfDay })
      .getRawOne();
  }

  async getGeneralStatistics() {
    const [
      products,
      accommodations,
      excursions,
      reservedAccommodations,
      dailySales,
    ] = await Promise.all([
      this.countActiveInactiveProducts(),
      this.countAccommodationsByState(),
      this.countExcursionsByState(),
      this.getReservedAccommodationsWithInvoices(),
      this.getDailySalesStatistics(),
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
