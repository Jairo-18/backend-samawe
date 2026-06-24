import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { CreditNote } from './../../shared/entities/creditNote.entity';
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
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsSold"',
        'COALESCE(SUM(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN detail.subtotal ELSE 0 END), 0) AS "totalAccommodationsSold"',
        'COALESCE(SUM(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN detail.subtotal ELSE 0 END), 0) AS "totalExcursionsSold"',
        'COALESCE(SUM(CASE WHEN invoiceType.code IN (\'FV\', \'FVE\') THEN detail.subtotal ELSE 0 END), 0) AS "totalSales"',
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsPurchased"',
        'COALESCE(SUM(CASE WHEN invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalPurchases"',
        'COUNT(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN 1 END) AS "countProducts"',
        'COUNT(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN 1 END) AS "countAccommodations"',
        'COUNT(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN 1 END) AS "countExcursions"',
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

    const raw = await query.getRawOne();
    return this.applyCreditNoteNetting(
      raw,
      startOfDay,
      endOfDay,
      organizationalId,
    );
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
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsSold"',
        'COALESCE(SUM(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN detail.subtotal ELSE 0 END), 0) AS "totalAccommodationsSold"',
        'COALESCE(SUM(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN detail.subtotal ELSE 0 END), 0) AS "totalExcursionsSold"',
        'COALESCE(SUM(CASE WHEN invoiceType.code IN (\'FV\', \'FVE\') THEN detail.subtotal ELSE 0 END), 0) AS "totalSales"',
        'COALESCE(SUM(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalProductsPurchased"',
        'COALESCE(SUM(CASE WHEN invoiceType.code = \'FC\' THEN detail.subtotal ELSE 0 END), 0) AS "totalPurchases"',
        'COUNT(CASE WHEN detail.productId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN 1 END) AS "countProducts"',
        'COUNT(CASE WHEN detail.accommodationId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN 1 END) AS "countAccommodations"',
        'COUNT(CASE WHEN detail.excursionId IS NOT NULL AND invoiceType.code IN (\'FV\', \'FVE\') THEN 1 END) AS "countExcursions"',
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

    const raw = await query.getRawOne();
    return this.applyCreditNoteNetting(
      raw,
      startOfDay,
      endOfDay,
      organizationalId,
    );
  }

  /**
   * Resta a las ventas brutas (por categoría y total) lo acreditado por notas
   * crédito de las facturas del rango → ventas NETAS. El neteo se hace por línea:
   * para cada ítem acreditado, `subtotal × (cantidadAcreditada / cantidad)`, en
   * la misma base que `detail.subtotal` (independiente de impuestos). Las compras
   * (FC) no se tocan: las NC solo existen sobre ventas electrónicas.
   */
  private async applyCreditNoteNetting(
    raw: any,
    startOfDay: Date,
    endOfDay: Date,
    organizationalId?: string,
  ): Promise<any> {
    const credited = await this.getCreditedSubtotalsByType(
      startOfDay,
      endOfDay,
      organizationalId,
    );

    const num = (v: unknown) => Number(v) || 0;
    raw.totalProductsSold = num(raw.totalProductsSold) - credited.products;
    raw.totalAccommodationsSold =
      num(raw.totalAccommodationsSold) - credited.accommodations;
    raw.totalExcursionsSold =
      num(raw.totalExcursionsSold) - credited.excursions;
    raw.totalSales = num(raw.totalSales) - credited.total;
    return raw;
  }

  /**
   * Subtotal acreditado (por notas crédito) en el rango, separado por tipo de
   * ítem (producto / hospedaje / excursión). Atribuido al periodo de la FACTURA.
   */
  private async getCreditedSubtotalsByType(
    startOfDay: Date,
    endOfDay: Date,
    organizationalId?: string,
  ): Promise<{
    products: number;
    accommodations: number;
    excursions: number;
    total: number;
  }> {
    const empty = { products: 0, accommodations: 0, excursions: 0, total: 0 };

    // Notas crédito cuyas facturas caen en el rango (y org).
    const cnQuery = this._invoiceDetailRepository.manager
      .getRepository(CreditNote)
      .createQueryBuilder('cn')
      .innerJoin('cn.invoice', 'invoice')
      .where('invoice.createdAt >= :startOfDay', { startOfDay })
      .andWhere('invoice.createdAt < :endOfDay', { endOfDay });
    if (organizationalId) {
      cnQuery.andWhere('invoice.organizationalId = :organizationalId', {
        organizationalId,
      });
    } else {
      cnQuery.andWhere('invoice.organizationalId IS NULL');
    }
    const notes = await cnQuery.getMany();
    if (!notes.length) return empty;

    // Cantidad acreditada por invoiceDetailId (suma de snapshots).
    const creditedQty = new Map<number, number>();
    for (const note of notes) {
      const sel = Array.isArray(note.itemsSnapshot)
        ? (note.itemsSnapshot as { invoiceDetailId: number; quantity: number }[])
        : [];
      for (const it of sel) {
        if (it && typeof it.invoiceDetailId === 'number') {
          creditedQty.set(
            it.invoiceDetailId,
            (creditedQty.get(it.invoiceDetailId) ?? 0) + Number(it.quantity ?? 0),
          );
        }
      }
    }
    if (!creditedQty.size) return empty;

    // Subtotal/cantidad/tipo de cada línea acreditada.
    const details = await this._invoiceDetailRepository
      .createQueryBuilder('detail')
      .select([
        'detail.invoiceDetailId AS "invoiceDetailId"',
        'detail.subtotal AS subtotal',
        'detail.amount AS amount',
        'detail.productId AS "productId"',
        'detail.accommodationId AS "accommodationId"',
        'detail.excursionId AS "excursionId"',
      ])
      .where('detail.invoiceDetailId IN (:...ids)', {
        ids: [...creditedQty.keys()],
      })
      .getRawMany();

    const acc = { products: 0, accommodations: 0, excursions: 0, total: 0 };
    for (const d of details) {
      const qty = creditedQty.get(Number(d.invoiceDetailId)) ?? 0;
      const amount = Number(d.amount) || 0;
      const subtotal = Number(d.subtotal) || 0;
      if (qty <= 0 || amount <= 0) continue;
      const creditedSubtotal = subtotal * (qty / amount);
      acc.total += creditedSubtotal;
      if (d.productId) acc.products += creditedSubtotal;
      else if (d.accommodationId) acc.accommodations += creditedSubtotal;
      else if (d.excursionId) acc.excursions += creditedSubtotal;
    }
    return acc;
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
