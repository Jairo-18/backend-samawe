import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { InventoryLowParamsDto } from './../dtos/inventoryAmount.dto';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { Injectable } from '@nestjs/common';
import { IsNull, LessThan } from 'typeorm';
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
      const { page, perPage, search, order, amount, organizationalId } = params;
      const skip = (page - 1) * perPage;

      const query = this.productRepository
        .createQueryBuilder('product')
        .select(['product.productId', 'product.name', 'product.amount'])
        .skip(skip)
        .take(perPage)
        .orderBy('product.amount', order || 'ASC');

      if (amount !== undefined && amount !== null) {
        query.andWhere('product.amount = :amount', { amount });
      } else {
        query.andWhere('product.amount < :maxAmount', { maxAmount: 10 });
      }

      if (search && search.trim()) {
        query.andWhere(
          `(product.name->>'es' ILIKE :search OR product.name->>'en' ILIKE :search)`,
          { search: `%${search.trim()}%` },
        );
      }

      if (organizationalId) {
        query.andWhere('product.organizationalId = :organizationalId', { organizationalId });
      } else {
        query.andWhere('product.organizationalId IS NULL');
      }

      const [products, total] = await query.getManyAndCount();

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
