import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
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
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const codeExist = await this._productRepository.findOne({
      where: { code: createProductDto.code },
    });

    if (codeExist) {
      throw new HttpException('El código ya está en uso', HttpStatus.CONFLICT);
    }

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

    // Primero obtenemos el producto que queremos actualizar
    const product = await this._productRepository.findOne({
      where: { productId: id },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    // Solo verificamos el código si se está intentando actualizar
    if (updateProductDto.code) {
      // Buscamos si existe algún producto con ese código
      const codeExist = await this._productRepository.findOne({
        where: { code: updateProductDto.code },
      });

      // Lanzamos error solo si encontramos un producto diferente con ese código
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

    Object.assign(product, updateProductDto);

    return await this._productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return await this._productRepository.find();
  }

  async findOne(productId: string): Promise<Product> {
    const parsedId = parseInt(productId, 10);

    if (isNaN(parsedId)) {
      throw new HttpException(
        'ID de producto inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const product = await this._productRepository.findOne({
      where: { productId: parsedId },
      relations: ['categoryType'],
    });

    if (!product) {
      throw new HttpException('El producto no existe', HttpStatus.NOT_FOUND);
    }

    return product;
  }

  async delete(productId: number): Promise<void> {
    const product = await this.findOne(productId.toString());

    const invoiceDetailCount = await this._invoiceDetaillRepository.count({
      where: {
        product: { productId }, // sigue siendo number
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
