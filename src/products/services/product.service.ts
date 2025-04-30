import { AvailableTypeRepository } from './../../shared/repositories/available.repository';
import { CategoryTypeRepository } from './../../shared/repositories/categoryType.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { Product } from './../../shared/entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './../dtos/product.dto';
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
    private readonly _availableTypeRepository: AvailableTypeRepository,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const { categoryTypeId, ...productData } = createProductDto;

      // Carga las entidades relacionadas
      const categoryType = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId: categoryTypeId },
      });

      if (!categoryType) {
        throw new BadRequestException('Tipo de categoría no encontrado');
      }

      const newProduct = this._productRepository.create({
        ...productData,
        categoryType,
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

    if (updateProductDto.categoryTypeId) {
      const category = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId: updateProductDto.categoryTypeId },
      });
      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }
      product.categoryType = category;
    }

    Object.assign(product, updateProductDto);

    return await this._productRepository.save(product);
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
