import { AccommodationImage } from './../../shared/entities/accommodationImage.entity';
import { AccommodationImageRepository } from './../../shared/repositories/accommodationImage.repository';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class AccommodationImageService {
  constructor(
    private readonly _accommodationImageRepository: AccommodationImageRepository,
    private readonly _accommodationRepository: AccommodationRepository,
  ) {}

  /**
   * Añadir una imagen a un hospedaje.
   *
   * Va al FINAL de la galería (`position` = máxima actual + 1), no primero:
   * el orden ahora lo decide el usuario arrastrando, no "lo último subido
   * pasa a portada".
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

    const nextPosition = await this.nextPosition(accommodationId);

    const newImage = this._accommodationImageRepository.create({
      imageUrl,
      publicId,
      position: nextPosition,
      accommodation,
    });

    return this._accommodationImageRepository.save(newImage);
  }

  private async nextPosition(accommodationId: number): Promise<number> {
    const { max } = await this._accommodationImageRepository
      .createQueryBuilder('image')
      .select('MAX(image.position)', 'max')
      .where('image.accommodationId = :accommodationId', { accommodationId })
      .getRawOne<{ max: number | null }>();
    return (max ?? -1) + 1;
  }

  /**
   * Reordena la galería: `orderedPublicIds` es el orden final que eligió el
   * usuario. Se valida que cada publicId pertenezca al hospedaje antes de
   * tocar nada, para no dejar posiciones a medio actualizar si llega un id
   * que no es de esta galería.
   */
  async reorderAccommodationImages(
    accommodationId: number,
    orderedPublicIds: string[],
  ): Promise<void> {
    const images = await this._accommodationImageRepository.find({
      where: { accommodation: { accommodationId } },
    });

    const byPublicId = new Map(images.map((img) => [img.publicId, img]));
    const missing = orderedPublicIds.find((id) => !byPublicId.has(id));
    if (missing) {
      throw new NotFoundException(
        `Imagen con publicId ${missing} no pertenece al hospedaje ${accommodationId}`,
      );
    }

    await Promise.all(
      orderedPublicIds.map((publicId, index) =>
        this._accommodationImageRepository.update(
          { accommodationImageId: byPublicId.get(publicId)!.accommodationImageId },
          { position: index },
        ),
      ),
    );
  }

  /**
   * Eliminar una imagen de un hospedaje (por publicId)
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
   * Reemplazar una imagen de un hospedaje
   */
  async replaceAccommodationImage(
    accommodationId: number,
    oldPublicId: string,
    newImageUrl: string,
    newPublicId: string,
  ): Promise<AccommodationImage> {
    const accommodation = await this._accommodationRepository.findOne({
      where: { accommodationId },
    });
    if (!accommodation) {
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

    image.imageUrl = newImageUrl;
    image.publicId = newPublicId;

    return this._accommodationImageRepository.save(image);
  }

  /**
   * Obtener todas las imágenes de un hospedaje
   */
  async getAccommodationImages(
    accommodationId: number,
  ): Promise<AccommodationImage[]> {
    const accommodation = await this._accommodationRepository.findOne({
      where: { accommodationId },
      relations: ['images'],
      order: { images: { position: 'ASC' } },
    });

    if (!accommodation) {
      throw new NotFoundException(
        `Hospedaje con id ${accommodationId} no encontrado`,
      );
    }

    return accommodation.images;
  }
}
