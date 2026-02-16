import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { InventoryLowParamsDto } from './../dtos/inventoryAmount.dto';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { Injectable } from '@nestjs/common';
import { LessThan, Like } from 'typeorm';
import { LowAmountProductDto } from '../dtos/inventoryAmount.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly productRepository: ProductRepository) {}

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
}
