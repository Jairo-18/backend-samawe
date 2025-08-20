import { AccommodationImage } from 'src/shared/entities/accommodationImage.entity';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { AccommodationImageRepository } from './../../shared/repositories/accommodationImage.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class AccommodationImageService {
  constructor(
    private readonly _accommodationImageRepository: AccommodationImageRepository,
    private readonly _accommodationRepository: AccommodationRepository,
  ) {}

  /**
   * Añadir una imagen a un Hospedaje
   */
  async addAccommodationImage(
    accommodationId: number,
    imageUrl: string,
    publicId: string,
  ): Promise<AccommodationImage> {
    const accommodation = await this._accommodationRepository.findOne({
      where: { accommodationId },
    });
    if (!accommodation) {
      throw new NotFoundException(
        `Hospedaje con id ${accommodationId} no encontrado`,
      );
    }

    const newImage = this._accommodationImageRepository.create({
      imageUrl,
      publicId,
      accommodation,
    });

    return this._accommodationImageRepository.save(newImage);
  }

  /**
   * Eliminar una imagen de un Hospedaje (por publicId)
   */
  async removeAccommodationImage(
    accommodationId: number,
    publicId: string,
  ): Promise<void> {
    const accommodation = await this._accommodationRepository.findOne({
      where: { accommodationId },
    });
    if (!accommodation) {
      throw new NotFoundException(
        `Hospedaje con id ${accommodationId} no encontrado`,
      );
    }

    const image = await this._accommodationImageRepository.findOne({
      where: { accommodation: { accommodationId }, publicId },
    });
    if (!image) {
      throw new NotFoundException(
        `Imagen con publicId ${publicId} no encontrada`,
      );
    }

    await this._accommodationImageRepository.remove(image);
  }

  /**
   * Reemplazar una imagen de un Hospedaje
   */
  async replaceAccommodationImage(
    accommodationId: number,
    oldPublicId: string,
    newImageUrl: string,
    newPublicId: string,
  ): Promise<AccommodationImage> {
    const Hospedaje = await this._accommodationRepository.findOne({
      where: { accommodationId },
    });
    if (!Hospedaje) {
      throw new NotFoundException(
        `Hospedaje con id ${accommodationId} no encontrado`,
      );
    }

    const image = await this._accommodationImageRepository.findOne({
      where: { accommodation: { accommodationId }, publicId: oldPublicId },
    });

    if (!image) {
      throw new NotFoundException(
        `Imagen con publicId ${oldPublicId} no encontrada`,
      );
    }

    // actualizar la imagen
    image.imageUrl = newImageUrl;
    image.publicId = newPublicId;

    return this._accommodationImageRepository.save(image);
  }

  /**
   * Obtener todas las imágenes de un Hospedaje
   */
  async getAccommodationImages(
    accommodationId: number,
  ): Promise<AccommodationImage[]> {
    const Hospedaje = await this._accommodationRepository.findOne({
      where: { accommodationId },
      relations: ['images'],
    });

    if (!Hospedaje) {
      throw new NotFoundException(
        `Hospedaje con id ${accommodationId} no encontrado`,
      );
    }

    return Hospedaje.images;
  }
}
