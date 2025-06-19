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
          'Mantenimiento',
          'Fuera de Servicio',
          'Ocupado',
          'Reservado',
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
        names: ['Disponible', 'Mantenimiento', 'Fuera de Servicio'],
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
        names: ['Reservado - Pagado', 'Reservado - Pendiente'],
      })
      .getRawMany();
  }

  async getGeneralStatistics() {
    const [products, accommodations, excursions, reservedAccommodations] =
      await Promise.all([
        this.countActiveInactiveProducts(),
        this.countAccommodationsByState(),
        this.countExcursionsByState(),
        this.getReservedAccommodationsWithInvoices(),
      ]);

    return {
      products,
      accommodations,
      excursions,
      reservedAccommodations, // 👈 extra agregado
    };
  }
}
