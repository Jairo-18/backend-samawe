import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';
import { OrganizationalMediaRepository } from '../../shared/repositories/organizationalMedia.repository';
import { MediaTypeRepository } from '../../shared/repositories/mediaType.repository';
import {
  CreateOrganizationalDto,
  UpdateOrganizationalDto,
  CreateOrganizationalMediaDto,
  UpdateOrganizationalMediaDto,
} from '../dtos/organizational.dto';
import { IdentificationTypeRepository } from '../../shared/repositories/identificationType.repository';
import { PersonTypeRepository } from '../../shared/repositories/personType.repository';
import { PhoneCodeRepository } from '../../shared/repositories/phoneCode.repository';
import { LocalStorageService } from '../../local-storage/services/local-storage.service';

@Injectable()
export class OrganizationalService {
  constructor(
    private readonly _organizationalRepository: OrganizationalRepository,
    private readonly _organizationalMediaRepository: OrganizationalMediaRepository,
    private readonly _mediaTypeRepository: MediaTypeRepository,
    private readonly _identificationTypeRepository: IdentificationTypeRepository,
    private readonly _personTypeRepository: PersonTypeRepository,
    private readonly _phoneCodeRepository: PhoneCodeRepository,
    private readonly _localStorageService: LocalStorageService,
  ) {}

  async create(dto: CreateOrganizationalDto) {
    const slugExists = await this._organizationalRepository.findOne({
      where: { slug: dto.slug },
    });
    if (slugExists) {
      throw new HttpException(
        'Ya existe una organización con ese slug',
        HttpStatus.CONFLICT,
      );
    }

    const identificationType = dto.identificationType
      ? await this._identificationTypeRepository.findOne({
          where: { identificationTypeId: dto.identificationType as any },
        })
      : null;

    const personType = dto.personType
      ? await this._personTypeRepository.findOne({
          where: { personTypeId: dto.personType },
        })
      : null;

    const phoneCode = dto.phoneCode
      ? await this._phoneCodeRepository.findOne({
          where: { phoneCodeId: dto.phoneCode as any },
        })
      : null;

    const result = await this._organizationalRepository.insert({
      ...dto,
      identificationType,
      personType,
      phoneCode,
    });

    return { rowId: result.identifiers[0].organizationalId };
  }

  async findAll() {
    return await this._organizationalRepository.find({
      relations: ['identificationType', 'personType', 'phoneCode'],
    });
  }

  async findAllWithFullData() {
    return await this._organizationalRepository.find({
      relations: [
        'medias',
        'medias.mediaType',
        'identificationType',
        'phoneCode',
        'personType',
      ],
    });
  }

  async findOne(organizationalId: string) {
    const org = await this._organizationalRepository.findOne({
      where: { organizationalId },
      relations: ['identificationType', 'personType', 'phoneCode'],
    });

    if (!org) {
      throw new HttpException(
        'Organización no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return org;
  }

  async findBySlug(slug: string) {
    const org = await this._organizationalRepository.findOne({
      where: { slug },
      relations: ['identificationType', 'personType', 'phoneCode'],
    });

    if (!org) {
      throw new HttpException(
        'Organización no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return org;
  }

  async update(organizationalId: string, dto: UpdateOrganizationalDto) {
    await this.findOne(organizationalId);

    if (dto.slug) {
      const slugExists = await this._organizationalRepository.findOne({
        where: { slug: dto.slug },
      });
      if (slugExists && slugExists.organizationalId !== organizationalId) {
        throw new HttpException(
          'Ya existe una organización con ese slug',
          HttpStatus.CONFLICT,
        );
      }
    }

    const identificationType = dto.identificationType
      ? await this._identificationTypeRepository.findOne({
          where: { identificationTypeId: dto.identificationType as any },
        })
      : undefined;

    const personType = dto.personType
      ? await this._personTypeRepository.findOne({
          where: { personTypeId: dto.personType },
        })
      : undefined;

    const phoneCode = dto.phoneCode
      ? await this._phoneCodeRepository.findOne({
          where: { phoneCodeId: dto.phoneCode as any },
        })
      : undefined;

    await this._organizationalRepository.update(
      { organizationalId },
      {
        ...dto,
        ...(identificationType && { identificationType }),
        ...(personType && { personType }),
        ...(phoneCode && { phoneCode }),
      },
    );
  }

  async delete(organizationalId: string) {
    await this.findOne(organizationalId);
    await this._organizationalRepository.delete({ organizationalId });
  }

  async addMedia(organizationalId: string, dto: CreateOrganizationalMediaDto) {
    const organizational = await this.findOne(organizationalId);

    const mediaType = await this._mediaTypeRepository.findOne({
      where: { mediaTypeId: dto.mediaTypeId },
    });

    if (!mediaType) {
      throw new HttpException(
        'Tipo de media no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!mediaType.allowsMultiple) {
      const existing = await this._organizationalMediaRepository.findOne({
        where: {
          organizational: { organizationalId },
          mediaType: { mediaTypeId: dto.mediaTypeId },
        },
      });
      if (existing) {
        await this._organizationalMediaRepository.update(
          { organizationalMediaId: existing.organizationalMediaId },
          {
            url: dto.url,
            publicId: dto.publicId,
            label: dto.label,
            priority: dto.priority ?? 0,
            isActive: dto.isActive ?? true,
          },
        );

        if (existing.publicId) {
          await this._localStorageService.deleteImage(existing.publicId);
        }
        return { rowId: existing.organizationalMediaId };
      }
    }

    const result = await this._organizationalMediaRepository.insert({
      url: dto.url,
      label: dto.label,
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? true,
      organizational,
      mediaType,
      publicId: dto.publicId,
    });

    return { rowId: result.identifiers[0].organizationalMediaId };
  }

  async updateMedia(
    organizationalMediaId: string,
    dto: UpdateOrganizationalMediaDto,
  ) {
    const media = await this._organizationalMediaRepository.findOne({
      where: { organizationalMediaId },
    });
    if (!media) {
      throw new HttpException('Media no encontrada', HttpStatus.NOT_FOUND);
    }

    await this._organizationalMediaRepository.update(
      { organizationalMediaId },
      {
        url: dto.url ?? media.url,
        label: dto.label ?? media.label,
        priority: dto.priority ?? media.priority,
        isActive: dto.isActive ?? media.isActive,
      },
    );
  }

  async deleteMedia(organizationalMediaId: string) {
    const media = await this._organizationalMediaRepository.findOne({
      where: { organizationalMediaId },
    });
    if (!media) {
      throw new HttpException('Media no encontrada', HttpStatus.NOT_FOUND);
    }
    if (media.publicId) {
      await this._localStorageService.deleteImage(media.publicId);
    }
    await this._organizationalMediaRepository.delete({ organizationalMediaId });
  }

  /**
   * Returns media items grouped by mediaType.code for use on the public frontend.
   * Single-item types return an object, multi-item types return an array sorted by priority.
   */
  async getMediaMap(organizationalId: string): Promise<Record<string, any>> {
    await this.findOne(organizationalId);

    const items = await this._organizationalMediaRepository.find({
      where: {
        organizational: { organizationalId },
        isActive: true,
      },
      relations: ['mediaType'],
      order: { priority: 'ASC' },
    });

    const map: Record<string, any> = {};

    for (const item of items) {
      const code = item.mediaType.code;
      const payload = {
        organizationalMediaId: item.organizationalMediaId,
        url: item.url,
        publicId: item.publicId,
        label: item.label,
        priority: item.priority,
      };

      if (!map[code]) map[code] = [];
      (map[code] as any[]).push(payload);
    }

    return map;
  }

  async findAllMediaTypes() {
    return await this._mediaTypeRepository.find({
      order: { mediaTypeId: 'ASC' },
    });
  }
}
