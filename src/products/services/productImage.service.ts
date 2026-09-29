import { ProductImage } from './../../shared/entities/productImage.entity';
import { ProductImageRepository } from './../../shared/repositories/productImage.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ProductImageService {
  constructor(
    private readonly _productImageRepository: ProductImageRepository,
    private readonly _productRepository: ProductRepository,
  ) {}

  /**
   * Añadir una imagen a un producto.
   *
   * Va al FINAL de la galería (`position` = máxima actual + 1), no primero:
   * el orden ahora lo decide el usuario arrastrando, no "lo último subido
   * pasa a portada".
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

    const nextPosition = await this.nextPosition(productId);

    const newImage = this._productImageRepository.create({
      imageUrl,
      publicId,
      position: nextPosition,
      product,
    });

    return this._productImageRepository.save(newImage);
  }

  private async nextPosition(productId: number): Promise<number> {
    const { max } = await this._productImageRepository
      .createQueryBuilder('image')
      .select('MAX(image.position)', 'max')
      .where('image.productId = :productId', { productId })
      .getRawOne<{ max: number | null }>();
    return (max ?? -1) + 1;
  }

  /**
   * Reordena la galería: `orderedPublicIds` es el orden final que eligió el
   * usuario. Se valida que cada publicId pertenezca al producto antes de
   * tocar nada, para no dejar posiciones a medio actualizar si llega un id
   * que no es de esta galería.
   */
  async reorderProductImages(
    productId: number,
    orderedPublicIds: string[],
  ): Promise<void> {
    const images = await this._productImageRepository.find({
      where: { product: { productId } },
    });

    const byPublicId = new Map(images.map((img) => [img.publicId, img]));
    const missing = orderedPublicIds.find((id) => !byPublicId.has(id));
    if (missing) {
      throw new NotFoundException(
        `Imagen con publicId ${missing} no pertenece al producto ${productId}`,
      );
    }

    await Promise.all(
      orderedPublicIds.map((publicId, index) =>
        this._productImageRepository.update(
          { productImageId: byPublicId.get(publicId)!.productImageId },
          { position: index },
        ),
      ),
    );
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
      order: { images: { position: 'ASC' } },
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${productId} no encontrado`);
    }

    return product.images;
  }
}
