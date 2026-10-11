import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';
import { OrganizationalMediaRepository } from '../../shared/repositories/organizationalMedia.repository';
import { MediaTypeRepository } from '../../shared/repositories/mediaType.repository';
import {
  CreateOrganizationalDto,
  UpdateOrganizationalDto,
  CreateOrganizationalMediaDto,
  UpdateOrganizationalMediaDto,
  CreateCorporateValueDto,
  UpdateCorporateValueDto,
} from '../dtos/organizational.dto';
import { CorporateValueRepository } from '../../shared/repositories/corporateValue.repository';
import { IdentificationTypeRepository } from '../../shared/repositories/identificationType.repository';
import { PersonTypeRepository } from '../../shared/repositories/personType.repository';
import { PhoneCodeRepository } from '../../shared/repositories/phoneCode.repository';
import { LocalStorageService } from '../../local-storage/services/local-storage.service';
import { TranslationService } from '../../shared/services/translation.service';

/**
 * Tablas con datos de un hotel. Una organización con filas en alguna de ellas no
 * se puede borrar: el `DELETE` reventaba con un error de llave foránea DESPUÉS de
 * haber borrado ya sus archivos (logo, fotos de valores corporativos).
 */
const ORGANIZATION_DATA_TABLES: { table: string; label: string }[] = [
  { table: 'User', label: 'usuarios' },
  { table: 'Invoice', label: 'facturas' },
  { table: 'Product', label: 'productos' },
  { table: 'Accommodation', label: 'hospedajes' },
  { table: 'Excursion', label: 'servicios' },
  { table: 'Recipe', label: 'recetas' },
  { table: 'Menu', label: 'menús' },
  { table: 'Review', label: 'reseñas' },
];

/** Resumen de uso de una organización, para el listado de plataforma. */
export interface OrganizationStats {
  users: number;
  invoices: number;
  products: number;
  accommodations: number;
  excursions: number;
}

const TRANSLATABLE_FIELDS: (keyof CreateOrganizationalDto)[] = [
  'description',
  'homeTitle', 'homeDescription',
  'experienceTitle', 'experienceDescription',
  'reservationTitle', 'reservationDescription',
  'aboutUsTitle', 'aboutUsDescription',
  'missionTitle', 'missionDescription',
  'visionTitle', 'visionDescription',
  'historyTitle', 'historyDescription',
  'gastronomyTitle', 'gastronomyDescription',
  'gastronomyHistoryTitle', 'gastronomyHistoryDescription',
  'gastronomyKitchenTitle', 'gastronomyKitchenDescription',
  'gastronomyIngredientsTitle', 'gastronomyIngredientsDescription',
  'accommodationsTitle', 'accommodationsDescription',
  'howToArriveDescription',
  'howToArrivePublicTransportDescription',
  'howToArrivePrivateTransportDescription',
  'accessibilityDescription',
  'metaTitle', 'metaDescription',
];

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
    private readonly _corporateValueRepository: CorporateValueRepository,
    private readonly _translationService: TranslationService,
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

    const translations = await this._translationService.translateFields(dto, TRANSLATABLE_FIELDS);

    const result = await this._organizationalRepository.insert({
      ...dto,
      ...translations,
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

  /**
   * Todas las organizaciones con lo que muestra el listado de plataforma:
   * datos, logo, dominios y cuánto uso tienen. Se agregan como propiedades de
   * la propia entidad (no un objeto nuevo) para que `@Exclude()` siga quitando
   * el refresh token de Google Business al serializar.
   */
  async findAllForPlatform() {
    const orgs = await this._organizationalRepository.find({
      relations: ['identificationType', 'personType', 'phoneCode', 'medias', 'medias.mediaType'],
      order: { createdAt: 'ASC' },
    });
    if (!orgs.length) return orgs;

    const manager = this._organizationalRepository.manager;
    const domains: { organizationalId: string; hostname: string; kind: string; status: string; isPrimary: boolean }[] =
      await manager.query(
        `SELECT "organizationalId", hostname, kind, status, "isPrimary"
           FROM organization_domains ORDER BY "isPrimary" DESC, hostname`,
      );
    const count = async (table: string) => {
      const rows: { organizationalId: string; n: number }[] = await manager.query(
        `SELECT "organizationalId", count(*)::int AS n FROM "${table}"
          WHERE "organizationalId" IS NOT NULL GROUP BY "organizationalId"`,
      );
      return new Map(rows.map((r) => [r.organizationalId, r.n]));
    };
    const [users, invoices, products, accommodations, excursions] = await Promise.all([
      count('User'),
      count('Invoice'),
      count('Product'),
      count('Accommodation'),
      count('Excursion'),
    ]);

    return orgs.map((org) =>
      Object.assign(org, {
        domains: domains
          .filter((d) => d.organizationalId === org.organizationalId)
          .map(({ organizationalId: _omit, ...d }) => d),
        stats: {
          users: users.get(org.organizationalId) ?? 0,
          invoices: invoices.get(org.organizationalId) ?? 0,
          products: products.get(org.organizationalId) ?? 0,
          accommodations: accommodations.get(org.organizationalId) ?? 0,
          excursions: excursions.get(org.organizationalId) ?? 0,
        } satisfies OrganizationStats,
      }),
    );
  }

  async findAllWithFullData() {
    return await this._organizationalRepository.find({
      relations: [
        'medias',
        'medias.mediaType',
        'identificationType',
        'phoneCode',
        'personType',
        'benefitSections',
        'benefitSections.items',
        'corporateValues',
        'legalSections',
        'legalSections.items',
        'legalSections.items.children',
      ],
      order: {
        benefitSections: { order: 'ASC' },
        corporateValues: { order: 'ASC' },
        legalSections: { items: { order: 'ASC', children: { order: 'ASC' } } },
      } as any,
    });
  }

  async findOne(organizationalId: string) {
    const org = await this._organizationalRepository.findOne({
      where: { organizationalId },
      relations: [
        'identificationType',
        'personType',
        'phoneCode',
        'legalRepresentative',
        'legalRepresentative.identificationType',
      ],
    });

    if (!org) {
      throw new HttpException(
        'Organización no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return org;
  }

  /** El hotel por id, con lo que necesita la vista pública (medios incluidos). */
  async findPublicById(organizationalId: string) {
    const org = await this._organizationalRepository.findOne({
      where: { organizationalId },
      relations: ['identificationType', 'phoneCode', 'medias', 'medias.mediaType'],
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
      relations: ['identificationType', 'personType', 'phoneCode', 'medias', 'medias.mediaType'],
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
    const current = await this.findOne(organizationalId);

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

    const translations = await this._translationService.translateFields(
      dto,
      TRANSLATABLE_FIELDS,
      current as unknown as Record<string, Record<string, string>>,
    );

    await this._organizationalRepository.update(
      { organizationalId },
      {
        ...dto,
        ...translations,
        ...(identificationType && { identificationType }),
        ...(personType && { personType }),
        ...(phoneCode && { phoneCode }),
      },
    );
  }

  async delete(organizationalId: string) {
    await this.findOne(organizationalId);

    // Antes de tocar archivos: si tiene datos, no se borra (ver
    // ORGANIZATION_DATA_TABLES). Desactivarla es la salida para un hotel que
    // deja de operar.
    const manager = this._organizationalRepository.manager;
    const inUse: string[] = [];
    for (const { table, label } of ORGANIZATION_DATA_TABLES) {
      const [{ n }] = await manager.query(
        `SELECT count(*)::int AS n FROM "${table}" WHERE "organizationalId" = $1`,
        [organizationalId],
      );
      if (n > 0) inUse.push(`${n} ${label}`);
    }
    if (inUse.length) {
      throw new HttpException(
        `No se puede eliminar: la organización tiene ${inUse.join(', ')}. ` +
          'Desactívala en su lugar.',
        HttpStatus.CONFLICT,
      );
    }

    const medias = await this._organizationalMediaRepository.find({
      where: { organizational: { organizationalId } },
    });
    for (const media of medias) {
      if (media.publicId) {
        await this._localStorageService.deleteImage(media.publicId);
      }
    }

    const corporateValues = await this._corporateValueRepository.find({
      where: { organizational: { organizationalId } },
    });
    for (const value of corporateValues) {
      if (value.imagePublicId) {
        await this._localStorageService.deleteImage(value.imagePublicId);
      }
    }

    await this._organizationalRepository.delete({ organizationalId });
  }

  /**
   * ¿Esta ranura guarda un vídeo en vez de una imagen?
   *
   * Se decide por el CÓDIGO del tipo, nunca por su id: los ids los asigna un
   * SERIAL al sembrar el catálogo y difieren entre bases —es la misma trampa
   * que con `InvoiceType`, donde `DSE` es 5 en producción y 6 en desarrollo—.
   */
  async isVideoMediaType(mediaTypeId: number): Promise<boolean> {
    const mediaType = await this._mediaTypeRepository.findOne({
      where: { mediaTypeId },
    });
    return mediaType?.code === 'HOME_VIDEO';
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

  async getCorporateValues(organizationalId: string) {
    await this.findOne(organizationalId);
    return await this._corporateValueRepository.find({
      where: { organizational: { organizationalId } },
      order: { order: 'ASC' },
    });
  }

  async createCorporateValue(
    organizationalId: string,
    dto: CreateCorporateValueDto,
  ) {
    const organizational = await this.findOne(organizationalId);
    const title = await this._translationService.toTranslatedField(dto.title);
    const description = dto.description
      ? await this._translationService.toTranslatedField(dto.description)
      : undefined;
    const result = await this._corporateValueRepository.insert({
      ...dto,
      title,
      description,
      order: dto.order ?? 0,
      organizational,
    });
    return { rowId: result.identifiers[0].corporateValueId };
  }

  async updateCorporateValue(
    corporateValueId: string,
    dto: UpdateCorporateValueDto,
  ) {
    const value = await this._corporateValueRepository.findOne({
      where: { corporateValueId },
    });
    if (!value) {
      throw new HttpException(
        'Valor corporativo no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const title = await this._translationService.toTranslatedField(dto.title);
    const description = dto.description
      ? await this._translationService.toTranslatedField(dto.description)
      : undefined;
    await this._corporateValueRepository.update(
      { corporateValueId },
      { ...dto, title, description },
    );
  }

  async uploadCorporateValueImage(
    corporateValueId: string,
    imageUrl: string,
    imagePublicId: string,
  ) {
    const value = await this._corporateValueRepository.findOne({
      where: { corporateValueId },
    });
    if (!value) {
      throw new HttpException(
        'Valor corporativo no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    if (value.imagePublicId) {
      await this._localStorageService.deleteImage(value.imagePublicId);
    }
    await this._corporateValueRepository.update(
      { corporateValueId },
      { imageUrl, imagePublicId },
    );
    return { imageUrl, imagePublicId };
  }

  async deleteCorporateValueImage(corporateValueId: string) {
    const value = await this._corporateValueRepository.findOne({
      where: { corporateValueId },
    });
    if (!value) {
      throw new HttpException(
        'Valor corporativo no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const publicId = value.imagePublicId;
    await this._corporateValueRepository.update(
      { corporateValueId },
      { imageUrl: null, imagePublicId: null },
    );
    return publicId;
  }

  async deleteCorporateValue(corporateValueId: string) {
    const value = await this._corporateValueRepository.findOne({
      where: { corporateValueId },
    });
    if (!value) {
      throw new HttpException(
        'Valor corporativo no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    if (value.imagePublicId) {
      await this._localStorageService.deleteImage(value.imagePublicId);
    }
    await this._corporateValueRepository.delete({ corporateValueId });
  }
}
