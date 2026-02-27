import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { CategoryTypeRepository } from './../../shared/repositories/categoryType.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { Product } from './../../shared/entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './../dtos/product.dto';
import { UnitOfMeasureRepository } from './../../shared/repositories/unitOfMeasure.repository';
import {
  mapProductDetail,
  ProductDetailDto,
} from './../../shared/mappers/entity-mappers';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class ProductService {
  constructor(
    private readonly _productRepository: ProductRepository,
    private readonly _categoryTypeRepository: CategoryTypeRepository,
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _unitOfMeasureRepository: UnitOfMeasureRepository,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const codeExist = await this._productRepository.findOne({
      where: { code: createProductDto.code },
    });

    if (codeExist) {
      throw new HttpException('El código ya está en uso', HttpStatus.CONFLICT);
    }

    try {
      const { categoryTypeId, unitOfMeasureId, ...productData } =
        createProductDto;

      const categoryType = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId: categoryTypeId },
      });

      if (!categoryType) {
        throw new BadRequestException('Tipo de categoría no encontrado');
      }

      let unitOfMeasure = null;
      if (unitOfMeasureId) {
        unitOfMeasure = await this._unitOfMeasureRepository.findOne({
          where: { unitOfMeasureId },
        });
        if (!unitOfMeasure) {
          throw new BadRequestException('Unidad de medida no encontrada');
        }
      }

      const newProduct = this._productRepository.create({
        ...productData,
        categoryType,
        ...(unitOfMeasure && { unitOfMeasure }),
      });

      return await this._productRepository.save(newProduct);
    } catch (error) {
      console.error('Error creando producto:', error);
      throw new BadRequestException('No se pudo crear el producto');
    }
  }

  async update(
    productId: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const id = parseInt(productId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('El ID del producto debe ser un número');
    }

    const product = await this._productRepository.findOne({
      where: { productId: id },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    if (updateProductDto.code) {
      const codeExist = await this._productRepository.findOne({
        where: { code: updateProductDto.code },
      });

      if (codeExist && codeExist.productId !== id) {
        throw new HttpException(
          'El código ya está en uso por otro producto',
          HttpStatus.CONFLICT,
        );
      }
    }

    if (updateProductDto.categoryTypeId) {
      const category = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId: updateProductDto.categoryTypeId },
      });
      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }
      product.categoryType = category;
    }

    if (updateProductDto.unitOfMeasureId !== undefined) {
      if (updateProductDto.unitOfMeasureId === null) {
        product.unitOfMeasure = null;
        product.unitOfMeasureId = null;
      } else {
        const unitOfMeasure = await this._unitOfMeasureRepository.findOne({
          where: { unitOfMeasureId: updateProductDto.unitOfMeasureId },
        });
        if (!unitOfMeasure) {
          throw new NotFoundException('Unidad de medida no encontrada');
        }
        product.unitOfMeasure = unitOfMeasure;
      }
    }

    Object.assign(product, updateProductDto);

    return await this._productRepository.save(product);
  }

  async findOne(productId: string): Promise<ProductDetailDto> {
    const parsedId = parseInt(productId, 10);

    if (isNaN(parsedId)) {
      throw new HttpException(
        'ID de producto inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const product = await this._productRepository.findOne({
      where: { productId: parsedId },
      relations: [
        'categoryType',
        'unitOfMeasure',
        'productRecipes',
        'productRecipes.ingredient',
        'images',
      ],
    });

    if (!product) {
      throw new HttpException('El producto no existe', HttpStatus.NOT_FOUND);
    }

    const catName = product.categoryType?.name?.toUpperCase();
    const hasRecipes =
      product.productRecipes && product.productRecipes.length > 0;

    if (
      catName === 'RESTAURANTE' ||
      catName === 'BAR' ||
      catName === 'MECATO'
    ) {
      let dynamicAmount = 0;
      if (hasRecipes) {
        let minPortions = Infinity;
        let calculatedPriceBuy = 0;

        for (const recipe of product.productRecipes) {
          const reqQty = Number(recipe.quantity);
          const ingredient = recipe.ingredient;
          const availableQty = Number(ingredient?.amount || 0);

          if (reqQty > 0) {
            const portions = Math.floor(availableQty / reqQty);
            if (portions < minPortions) {
              minPortions = portions;
            }
          } else {
            minPortions = 0;
          }

          if (catName === 'RESTAURANTE') {
            const ingredientPriceBuy = Number(ingredient?.priceBuy || 0);
            calculatedPriceBuy += reqQty * ingredientPriceBuy;
          }
        }
        dynamicAmount = minPortions === Infinity ? 0 : minPortions;

        if (catName === 'RESTAURANTE') {
          product.priceBuy = Number(calculatedPriceBuy.toFixed(2));
        }
      }
      product.amount = dynamicAmount;
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

      product.priceBuy = Number(calculatedPriceBuy.toFixed(2));
      product.priceSale = Number(calculatedPriceSale.toFixed(2));
      product.amount = minPortions === Infinity ? 0 : minPortions;
    }

    return mapProductDetail(product);
  }

  async delete(productId: number): Promise<void> {
    const product = await this.findOne(productId.toString());

    const invoiceDetailCount = await this._invoiceDetaillRepository.count({
      where: {
        product: { productId },
      },
    });

    if (invoiceDetailCount > 0) {
      throw new BadRequestException(
        `El producto ${product.name} está asociado a una factura y no puede eliminarse.`,
      );
    }

    await this._productRepository.delete(productId);
  }
}
