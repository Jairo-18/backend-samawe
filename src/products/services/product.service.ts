import { AvailableTypeRepository } from './../../shared/repositories/available.repository';
import { CategoryTypeRepository } from './../../shared/repositories/categoryType.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { Product } from './../../shared/entities/product.entity';
import { CreateProductDto } from './../dtos/product.dto';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class ProductService {
  constructor(
    private readonly _productRepository: ProductRepository,
    private readonly _categoryTypeRepository: CategoryTypeRepository,
    private readonly _availableTypeRepository: AvailableTypeRepository,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const { categoryTypeId, availableTypeId, ...productData } =
        createProductDto;

      // Carga las entidades relacionadas
      const categoryType = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId: categoryTypeId },
      });
      const availableType = await this._availableTypeRepository.findOne({
        where: { availableTypeId: availableTypeId },
      });

      if (!categoryType || !availableType) {
        throw new BadRequestException(
          'Tipo de categoría o disponibilidad no encontrado',
        );
      }

      const newProduct = this._productRepository.create({
        ...productData,
        categoryType,
        availableType,
      });

      return await this._productRepository.save(newProduct);
    } catch (error) {
      console.error('Error creando producto:', error);
      throw new BadRequestException('No se pudo crear el producto');
    }
  }

  async findAll(): Promise<Product[]> {
    return await this._productRepository.find();
  }

  async findOne(productId: string): Promise<Product> {
    const id = parseInt(productId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('El ID del producto debe ser un número');
    }

    const product = await this._productRepository.findOne({
      where: { productId: id },
    });

    if (!product) {
      throw new HttpException('El producto no existe', HttpStatus.NOT_FOUND);
    }

    return product;
  }

  async delete(productId: string) {
    await this.findOne(productId);
    return await this._productRepository.delete(productId);
  }
}
