import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { StateTypeRepository } from './../../shared/repositories/stateType.repository';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { InventoryLowParamsDto } from './../dtos/inventoryAmount.dto';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { Injectable } from '@nestjs/common';
import { IsNull, LessThan, Like, MoreThan, Not } from 'typeorm';
import { LowAmountProductDto } from '../dtos/inventoryAmount.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _accommodationRepository: AccommodationRepository,
  ) {}

  /**
   * Busca productos con bajo stock, filtrando por nombre y/o cantidad, y paginados
   * @param params Parámetros de búsqueda y paginación
   * @returns Productos filtrados con paginación
   */
  async paginatedList(
    params: InventoryLowParamsDto,
  ): Promise<ResponsePaginationDto<LowAmountProductDto>> {
    try {
      const { page, perPage, search, order, amount } = params;
      const skip = (page - 1) * perPage;

      // Construir condiciones WHERE
      const where: any = {};

      // Filtro por cantidad exacta o por defecto menor a 10
      if (amount !== undefined && amount !== null) {
        where.amount = amount;
      } else {
        where.amount = LessThan(10);
      }

      // Filtro por nombre (opcional)
      if (search && search.trim()) {
        where.name = Like(`%${search.trim()}%`);
      }

      const [products, total] = await this.productRepository.findAndCount({
        where,
        select: ['productId', 'name', 'amount'],
        order: {
          amount: order || 'ASC',
        },
        skip,
        take: perPage,
      });

      const data: LowAmountProductDto[] = products.map((product) => ({
        productId: product.productId,
        name: product.name,
        amount: product.amount,
      }));

      const pagination = new PageMetaDto({
        pageOptionsDto: params,
        itemCount: total,
      });

      return new ResponsePaginationDto(data, pagination);
    } catch (error) {
      throw new Error(
        `Error al buscar productos con bajo stock: ${error.message}`,
      );
    }
  }

  async updateAccommodationsState(): Promise<void> {
    const now = new Date();

    // Buscar detalles vencidos con accommodation asociado
    const expiredDetails = await this._invoiceDetaillRepository.find({
      where: {
        endDate: LessThan(now),
        accommodation: Not(IsNull()),
      },
      relations: ['accommodation', 'accommodation.stateType'],
    });

    const mantenimientoState = await this._stateTypeRepository.findOne({
      where: { stateTypeId: 3 }, // Mantenimiento
    });

    if (!mantenimientoState) {
      throw new Error('Estado con ID 3 ("Mantenimiento") no encontrado');
    }

    for (const detail of expiredDetails) {
      const accommodation = detail.accommodation;

      if (
        accommodation &&
        accommodation.accommodationId !== 0 &&
        accommodation.stateType?.stateTypeId === 4 // Estado actual: Ocupado
      ) {
        // Verificar si todavía hay otro detalle activo para este alojamiento
        const existeOtroDetalleActivo =
          await this._invoiceDetaillRepository.exist({
            where: {
              accommodation: { accommodationId: accommodation.accommodationId },
              endDate: MoreThan(now),
            },
          });

        if (!existeOtroDetalleActivo) {
          // Solo actualizar si no hay otro detalle activo
          await this._accommodationRepository.update(
            { accommodationId: accommodation.accommodationId },
            { stateType: { stateTypeId: 3 } }, // Cambiar a Mantenimiento
          );
        }
      }
    }
  }
}
