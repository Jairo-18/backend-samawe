import { ProductRepository } from './../../shared/repositories/product.repository';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  PaginatedListProductsParamsDto,
  PaginatedProductSelectParamsDto,
  PartialProductDto,
} from './../dtos/crudProduct.dto';
import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { ProductInterfacePaginatedList } from '../interface/product.interface';

@Injectable()
export class CrudProductService {
  constructor(private readonly _productRepository: ProductRepository) {}

  async paginatedList(params: PaginatedListProductsParamsDto) {
    const skip = (params.page - 1) * params.perPage;
    const query = this._productRepository
      .createQueryBuilder('Product')
      .leftJoinAndSelect('Product.categoryType', 'categoryType')
      .leftJoinAndSelect('Product.unitOfMeasure', 'unitOfMeasure')
      .leftJoinAndSelect('Product.productRecipes', 'productRecipes')
      .leftJoinAndSelect(
        'productRecipes.ingredient',
        'productRecipesIngredient',
      )
      .leftJoinAndSelect('Product.images', 'images')
      .skip(skip)
      .take(params.perPage)
      .orderBy('Product.name', 'ASC');

    if (params.name) {
      query.andWhere('Product.name ILIKE :name', { name: `%${params.name}%` });
    }

    if (params.code) {
      query.andWhere('Product.code ILIKE :code', { name: `%${params.code}%` });
    }

    if (params.description) {
      query.andWhere('Product.description ILIKE :description', {
        description: `%${params.description}%`,
      });
    }

    if (params.amount !== undefined) {
      query.andWhere('Product.amount = :amount', { amount: params.amount });
    }

    if (params.priceBuy !== undefined) {
      query.andWhere('Product.priceBuy = :priceBuy', {
        priceBuy: params.priceBuy,
      });
    }

    if (params.priceSale !== undefined) {
      query.andWhere('Product.priceSale = :priceSale', {
        priceSale: params.priceSale,
      });
    }

    if (params.isActive !== undefined) {
      query.andWhere('Product.isActive = :isActive', {
        isActive: params.isActive,
      });
    }

    if (params.categoryType) {
      query.andWhere('categoryType.categoryTypeId = :categoryTypeId', {
        categoryTypeId: params.categoryType,
      });
    }

    if (params.categoryTypeCode) {
      const codes = params.categoryTypeCode.split(',').map((c) => c.trim());
      if (codes.length > 1) {
        query.andWhere('categoryType.code IN (:...codes)', { codes });
      } else {
        query.andWhere('categoryType.code = :code', { code: codes[0] });
      }
    }

    if (
      params.excludeWithRecipe === true ||
      params.excludeWithRecipe?.toString() === 'true'
    ) {
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('recipe.productId')
          .from('Recipe', 'recipe')
          .where('recipe.productId = Product.productId')
          .getQuery();
        return 'NOT EXISTS ' + subQuery;
      });
    }

    if (params.search) {
      const search = params.search.trim();
      query.andWhere(
        '(Product.name ILIKE :search OR Product.code ILIKE :search OR Product.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [entities, itemCount] = await query.getManyAndCount();

    const products: ProductInterfacePaginatedList[] = entities.map(
      (product) => {
        let dynamicAmount = Number(product.amount || 0);
        let dynamicPriceBuy = Number(product.priceBuy || 0);
        let dynamicPriceSale = Number(product.priceSale || 0);

        const catName = product.categoryType?.name?.toUpperCase();
        const hasRecipes =
          product.productRecipes && product.productRecipes.length > 0;

        if (catName === 'RESTAURANTE' && hasRecipes) {
          let minPortions = Infinity;
          let calculatedPriceBuy = 0;

          for (const recipe of product.productRecipes) {
            const reqQty = Number(recipe.quantity);
            const ingredient = recipe.ingredient;
            const availableQty = Number(ingredient?.amount || 0);
            const ingredientPriceBuy = Number(ingredient?.priceBuy || 0);

            calculatedPriceBuy += reqQty * ingredientPriceBuy;

            if (reqQty > 0) {
              const portions = Math.floor(availableQty / reqQty);
              if (portions < minPortions) {
                minPortions = portions;
              }
            } else {
              minPortions = 0;
            }
          }

          dynamicPriceBuy = Number(calculatedPriceBuy.toFixed(2));
          dynamicAmount = minPortions === Infinity ? 0 : minPortions;
        } else if (
          (catName === 'RESTAURANTE' ||
            catName === 'BAR' ||
            catName === 'MECATO') &&
          hasRecipes
        ) {
          let minPortions = Infinity;
          for (const recipe of product.productRecipes) {
            const reqQty = Number(recipe.quantity);
            const availableQty = Number(recipe.ingredient?.amount || 0);
            if (reqQty > 0) {
              const portions = Math.floor(availableQty / reqQty);
              if (portions < minPortions) minPortions = portions;
            } else {
              minPortions = 0;
            }
          }
          dynamicAmount = minPortions === Infinity ? 0 : minPortions;
        } else if (catName === 'RESTAURANTE') {
          dynamicAmount = 0;
        }

        if (catName === 'INGREDIENTE' && hasRecipes) {
          let calculatedPriceBuy = 0;
          let calculatedPriceSale = 0;
          let minPortions = Infinity;

          for (const recipe of product.productRecipes) {
            const reqQty = Number(recipe.quantity);
            const ingredient = recipe.ingredient;
            const ingredientPriceBuy = Number(ingredient?.priceBuy || 0);
            const ingredientPriceSale = Number(ingredient?.priceSale || 0);
            const availableQty = Number(ingredient?.amount || 0);

            calculatedPriceBuy += reqQty * ingredientPriceBuy;
            calculatedPriceSale += reqQty * ingredientPriceSale;

            if (reqQty > 0) {
              const portions = Math.floor(availableQty / reqQty);
              if (portions < minPortions) {
                minPortions = portions;
              }
            } else {
              minPortions = 0;
            }
          }

          dynamicPriceBuy = Number(calculatedPriceBuy.toFixed(2));
          dynamicPriceSale = Number(calculatedPriceSale.toFixed(2));
          dynamicAmount = minPortions === Infinity ? 0 : minPortions;
        }

        return {
          productId: product.productId,
          code: product.code,
          name: product.name,
          description: product.description,
          amount: dynamicAmount,
          isActive: product.isActive,
          priceBuy: dynamicPriceBuy,
          priceSale: dynamicPriceSale,
          categoryType: product.categoryType
            ? {
                categoryTypeId: product.categoryType.categoryTypeId,
                code: product.categoryType.code,
                name: product.categoryType.name,
              }
            : null,
          unitOfMeasure: product.unitOfMeasure
            ? {
                unitOfMeasureId: product.unitOfMeasure.unitOfMeasureId,
                code: product.unitOfMeasure.code,
                name: product.unitOfMeasure.name,
              }
            : null,
          images:
            product.images?.map((img) => ({
              productImageId: img.productImageId,
              imageUrl: img.imageUrl,
              publicId: img.publicId,
            })) || [],
        };
      },
    );

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(products, pageMetaDto);
  }

  async paginatedPartialProducts(
    params: PaginatedProductSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialProductDto>> {
    const skip = (params.page - 1) * params.perPage;
    const where = [];

    if (params.search) {
      const search = params.search.trim();
      where.push({ name: ILike(`%${search}%`) });
    } else {
      where.push({});
    }

    const [entities, itemCount] = await this._productRepository.findAndCount({
      where,
      skip,
      take: params.perPage,
      order: { name: params.order ?? 'ASC' },
      select: ['productId', 'name'],
    });

    const items: PartialProductDto[] = entities.map((e) => ({
      name: e.name!,
    }));

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(items, pageMetaDto);
  }
}
