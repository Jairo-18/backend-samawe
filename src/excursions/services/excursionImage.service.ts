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
   * Añadir una imagen a un excursion.
   *
   * Va al FINAL de la galería (`position` = máxima actual + 1), no primero:
   * el orden ahora lo decide el usuario arrastrando, no "lo último subido
   * pasa a portada".
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

    const nextPosition = await this.nextPosition(excursionId);

    const newImage = this._excursionImageRepository.create({
      imageUrl,
      publicId,
      position: nextPosition,
      excursion,
    });

    return this._excursionImageRepository.save(newImage);
  }

  private async nextPosition(excursionId: number): Promise<number> {
    const { max } = await this._excursionImageRepository
      .createQueryBuilder('image')
      .select('MAX(image.position)', 'max')
      .where('image.excursionId = :excursionId', { excursionId })
      .getRawOne<{ max: number | null }>();
    return (max ?? -1) + 1;
  }

  /**
   * Reordena la galería: `orderedPublicIds` es el orden final que eligió el
   * usuario. Se valida que cada publicId pertenezca a la pasadía antes de
   * tocar nada, para no dejar posiciones a medio actualizar si llega un id
   * que no es de esta galería.
   */
  async reorderExcursionImages(
    excursionId: number,
    orderedPublicIds: string[],
  ): Promise<void> {
    const images = await this._excursionImageRepository.find({
      where: { excursion: { excursionId } },
    });

    const byPublicId = new Map(images.map((img) => [img.publicId, img]));
    const missing = orderedPublicIds.find((id) => !byPublicId.has(id));
    if (missing) {
      throw new NotFoundException(
        `Imagen con publicId ${missing} no pertenece a la pasadía ${excursionId}`,
      );
    }

    await Promise.all(
      orderedPublicIds.map((publicId, index) =>
        this._excursionImageRepository.update(
          { excursionImageId: byPublicId.get(publicId)!.excursionImageId },
          { position: index },
        ),
      ),
    );
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
      order: { images: { position: 'ASC' } },
    });

    if (!excursion) {
      throw new NotFoundException(
        `Excursion con id ${excursionId} no encontrado`,
      );
    }

    return excursion.images;
  }
}
