import { ProductRepository } from './../../shared/repositories/product.repository';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { Product } from './../../shared/entities/product.entity';
import {
  CreateProductRelatedDataDto,
  PaginatedListProductsParamsDto,
} from './../dtos/crudProduct.dto';
import { TaxeType } from './../../shared/entities/taxeType.entity';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { RepositoryService } from '../../shared/services/repositoriry.service';
import { Injectable } from '@nestjs/common';
import { Equal, FindOptionsWhere, ILike } from 'typeorm';

@Injectable()
export class CrudProductService {
  constructor(
    private readonly _repositoriesService: RepositoryService,
    private readonly _productRepository: ProductRepository,
  ) {}

  async getRelatedDataToCreate(): Promise<CreateProductRelatedDataDto> {
    const categoryType =
      await this._repositoriesService.getEntities<CategoryType>(
        this._repositoriesService.repositories.categoryType,
      );

    const taxeType = await this._repositoriesService.getEntities<TaxeType>(
      this._repositoriesService.repositories.taxeType,
    );

    return { categoryType, taxeType };
  }

  async paginatedList(params: PaginatedListProductsParamsDto) {
    const skip = (params.page - 1) * params.perPage;
    const where: FindOptionsWhere<Product>[] = [];

    const baseConditions: FindOptionsWhere<Product> = {};

    if (params.code !== undefined) {
      baseConditions.code = Equal(params.code);
    }

    if (params.name) {
      baseConditions.name = ILike(`%${params.name}%`);
    }

    if (params.description) {
      baseConditions.description = ILike(`%${params.description}%`);
    }

    if (params.amount !== undefined) {
      baseConditions.amount = Equal(params.amount);
    }

    if (params.priceBuy !== undefined) {
      baseConditions.priceBuy = Equal(params.priceBuy);
    }

    if (params.priceSale !== undefined) {
      baseConditions.priceSale = Equal(params.priceSale);
    }

    if (params.categoryType) {
      baseConditions.categoryType = {
        categoryTypeId: params.categoryType,
      };
    }

    // Búsqueda global
    if (params.search) {
      const search = params.search.trim();
      const searchConditions: FindOptionsWhere<Product>[] = [
        { name: ILike(`%${search}%`) },
        { description: ILike(`%${search}%`) },
      ];

      // Si el valor global parece un número, también filtrar campos numéricos
      const searchNumber = Number(search);
      if (!isNaN(searchNumber)) {
        searchConditions.push(
          { code: Equal(searchNumber) },
          { amount: Equal(searchNumber) },
          { priceBuy: Equal(searchNumber) },
          { priceSale: Equal(searchNumber) },
        );
      }

      searchConditions.forEach((condition) => {
        where.push({ ...baseConditions, ...condition });
      });
    } else {
      where.push(baseConditions);
    }

    const [entities, itemCount] = await this._productRepository.findAndCount({
      where,
      skip,
      take: params.perPage,
      order: { createdAt: params.order ?? 'DESC' },
      relations: ['categoryType'],
    });

    // Ajustar salida
    const products = entities.map((product) => {
      return {
        ...product,
        categoryTypeId: product?.categoryType?.categoryTypeId,
      };
    });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(products, pageMetaDto);
  }
}
