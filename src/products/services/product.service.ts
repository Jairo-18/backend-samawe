import { RecipeRepository } from './../../shared/repositories/recipe.repository';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { CategoryTypeRepository } from './../../shared/repositories/categoryType.repository';
import { OrganizationalRepository } from './../../shared/repositories/organizational.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { TaxeTypeRepository } from './../../shared/repositories/taxeType.repository';
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
import { LocalStorageService } from '../../local-storage/services/local-storage.service';
import { TranslationService } from '../../shared/services/translation.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly _productRepository: ProductRepository,
    private readonly _categoryTypeRepository: CategoryTypeRepository,
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _unitOfMeasureRepository: UnitOfMeasureRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
    private readonly _recipeRepository: RecipeRepository,
    private readonly _localStorageService: LocalStorageService,
    private readonly _taxeTypeRepository: TaxeTypeRepository,
    private readonly _translationService: TranslationService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const codeExist = await this._productRepository.findOne({
      where: { code: createProductDto.code },
    });

    if (codeExist) {
      throw new HttpException('El código ya está en uso', HttpStatus.CONFLICT);
    }

    try {
      const {
        categoryTypeId,
        unitOfMeasureId,
        organizationalId,
        taxeTypeId,
        ...productData
      } = createProductDto;

      const categoryType = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId: categoryTypeId },
      });

      if (!categoryType) {
        throw new BadRequestException('Tipo de categoría no encontrado');
      }

      let organizational = null;
      if (organizationalId) {
        organizational = await this._organizationalRepository.findOne({
          where: { organizationalId },
        });
        if (!organizational) {
          throw new BadRequestException('Organización no encontrada');
        }
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

      let taxeType = null;
      if (taxeTypeId) {
        taxeType = await this._taxeTypeRepository.findOne({
          where: { taxeTypeId },
        });
        if (!taxeType) {
          throw new BadRequestException('Tipo de impuesto no encontrado');
        }
      }

      const name = await this._translationService.toTranslatedField(createProductDto.name);
      const description = createProductDto.description
        ? await this._translationService.toTranslatedField(createProductDto.description)
        : undefined;

      const newProduct = this._productRepository.create({
        ...productData,
        name,
        ...(description && { description }),
        categoryType,
        ...(unitOfMeasure && { unitOfMeasure }),
        ...(organizational && { organizational }),
        ...(taxeType && { taxeType }),
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

    if (updateProductDto.organizationalId !== undefined) {
      if (updateProductDto.organizationalId === null) {
        product.organizational = null;
      } else {
        const org = await this._organizationalRepository.findOne({
          where: { organizationalId: updateProductDto.organizationalId },
        });
        if (!org) {
          throw new NotFoundException('Organización no encontrada');
        }
        product.organizational = org;
      }
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

    if (updateProductDto.taxeTypeId !== undefined) {
      if (updateProductDto.taxeTypeId === null) {
        product.taxeType = null;
      } else {
        const taxeType = await this._taxeTypeRepository.findOne({
          where: { taxeTypeId: updateProductDto.taxeTypeId },
        });
        if (!taxeType) {
          throw new NotFoundException('Tipo de impuesto no encontrado');
        }
        product.taxeType = taxeType;
      }
    }

    const { taxeTypeId: _t, name: rawName, description: rawDesc, ...updateData } = updateProductDto;
    if (rawName) updateData['name'] = await this._translationService.toTranslatedField(rawName);
    if (rawDesc) updateData['description'] = await this._translationService.toTranslatedField(rawDesc);
    Object.assign(product, updateData);

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
        'taxeType',
        'productRecipes',
        'productRecipes.ingredient',
        'images',
      ],
    });

    if (!product) {
      throw new HttpException('El producto no existe', HttpStatus.NOT_FOUND);
    }

    const catName = product.categoryType?.name?.['es']?.toUpperCase();
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
        `El producto ${product.name?.['es'] ?? JSON.stringify(product.name)} está asociado a una factura y no puede eliminarse.`,
      );
    }

    const recipeCount = await this._recipeRepository.count({
      where: { product: { productId } },
    });

    if (recipeCount > 0) {
      throw new BadRequestException(
        `El producto ${product.name?.['es'] ?? JSON.stringify(product.name)} está asociado a una receta y no puede eliminarse.`,
      );
    }

    const productWithImages = await this._productRepository.findOne({
      where: { productId },
      relations: ['images'],
    });
    if (productWithImages?.images?.length) {
      for (const image of productWithImages.images) {
        await this._localStorageService.deleteImage(image.publicId);
      }
    }

    await this._productRepository.delete(productId);
  }
}
