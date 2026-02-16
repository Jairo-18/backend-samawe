import { ExcursionImage } from './../../shared/entities/escursionImage.entity';
import { ExcursionImageRepository } from './../../shared/repositories/excursionImage.repository';
import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ExcursionImageService {
  constructor(
    private readonly _excursionImageRepository: ExcursionImageRepository,
    private readonly _excursionRepository: ExcursionRepository,
  ) {}

  /**
   * Añadir una imagen a un excursion
   */
  async addExcursionImage(
    excursionId: number,
    imageUrl: string,
    publicId: string,
  ): Promise<ExcursionImage> {
    const excursion = await this._excursionRepository.findOne({
      where: { excursionId },
    });
    if (!excursion) {
      throw new NotFoundException(
        `Excursion con id ${excursionId} no encontrado`,
      );
    }

    const newImage = this._excursionImageRepository.create({
      imageUrl,
      publicId,
      excursion,
    });

    return this._excursionImageRepository.save(newImage);
  }

  /**
   * Eliminar una imagen de un excursion (por publicId)
   */
  async removeExcursionImage(
    excursionId: number,
    publicId: string,
  ): Promise<void> {
    const excursion = await this._excursionRepository.findOne({
      where: { excursionId },
    });
    if (!excursion) {
      throw new NotFoundException(
        `Excursion con id ${excursionId} no encontrado`,
      );
    }

    const image = await this._excursionImageRepository.findOne({
      where: { excursion: { excursionId }, publicId },
    });
    if (!image) {
      throw new NotFoundException(
        `Imagen con publicId ${publicId} no encontrada`,
      );
    }

    await this._excursionImageRepository.remove(image);
  }

  /**
   * Reemplazar una imagen de un excursion
   */
  async replaceExcursionImage(
    excursionId: number,
    oldPublicId: string,
    newImageUrl: string,
    newPublicId: string,
  ): Promise<ExcursionImage> {
    const excursion = await this._excursionRepository.findOne({
      where: { excursionId },
    });
    if (!excursion) {
      throw new NotFoundException(
        `Excursion con id ${excursionId} no encontrado`,
      );
    }

    const image = await this._excursionImageRepository.findOne({
      where: { excursion: { excursionId }, publicId: oldPublicId },
    });

    if (!image) {
      throw new NotFoundException(
        `Imagen con publicId ${oldPublicId} no encontrada`,
      );
    }

    // actualizar la imagen
    image.imageUrl = newImageUrl;
    image.publicId = newPublicId;

    return this._excursionImageRepository.save(image);
  }

  /**
   * Obtener todas las imágenes de un excursion
   */
  async getExcursionImages(excursionId: number): Promise<ExcursionImage[]> {
    const excursion = await this._excursionRepository.findOne({
      where: { excursionId },
      relations: ['images'],
    });

    if (!excursion) {
      throw new NotFoundException(
        `Excursion con id ${excursionId} no encontrado`,
      );
    }

    return excursion.images;
  }
}
