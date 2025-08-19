import { ProductImage } from './../../shared/entities/productImage.entity';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { ProductImageRepository } from './../../shared/repositories/productImage.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ProductImageService {
  constructor(
    private readonly _productImageRepository: ProductImageRepository,
    private readonly _productRepository: ProductRepository,
  ) {}

  /**
   * Añadir una imagen a un producto
   */
  async addProductImage(
    productId: number,
    imageUrl: string,
    publicId: string,
  ): Promise<ProductImage> {
    const product = await this._productRepository.findOne({
      where: { productId },
    });
    if (!product) {
      throw new NotFoundException(`Producto con id ${productId} no encontrado`);
    }

    const newImage = this._productImageRepository.create({
      imageUrl,
      publicId,
      product,
    });

    return this._productImageRepository.save(newImage);
  }

  /**
   * Eliminar una imagen de un producto (por publicId)
   */
  async removeProductImage(productId: number, publicId: string): Promise<void> {
    const product = await this._productRepository.findOne({
      where: { productId },
    });
    if (!product) {
      throw new NotFoundException(`Producto con id ${productId} no encontrado`);
    }

    const image = await this._productImageRepository.findOne({
      where: { product: { productId }, publicId },
    });
    if (!image) {
      throw new NotFoundException(
        `Imagen con publicId ${publicId} no encontrada`,
      );
    }

    await this._productImageRepository.remove(image);
  }

  /**
   * Reemplazar una imagen de un producto
   */
  async replaceProductImage(
    productId: number,
    oldPublicId: string,
    newImageUrl: string,
    newPublicId: string,
  ): Promise<ProductImage> {
    const product = await this._productRepository.findOne({
      where: { productId },
    });
    if (!product) {
      throw new NotFoundException(`Producto con id ${productId} no encontrado`);
    }

    const image = await this._productImageRepository.findOne({
      where: { product: { productId }, publicId: oldPublicId },
    });

    if (!image) {
      throw new NotFoundException(
        `Imagen con publicId ${oldPublicId} no encontrada`,
      );
    }

    // actualizar la imagen
    image.imageUrl = newImageUrl;
    image.publicId = newPublicId;

    return this._productImageRepository.save(image);
  }

  /**
   * Obtener todas las imágenes de un producto
   */
  async getProductImages(productId: number): Promise<ProductImage[]> {
    const product = await this._productRepository.findOne({
      where: { productId },
      relations: ['images'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${productId} no encontrado`);
    }

    return product.images;
  }
}
