import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { StateTypeRepository } from './../../shared/repositories/stateType.repository';
import { OrganizationalRepository } from './../../shared/repositories/organizational.repository';
import { BedTypeRepository } from './../../shared/repositories/bedType.repository';
import { CategoryTypeRepository } from './../../shared/repositories/categoryType.repository';
import { TaxeTypeRepository } from './../../shared/repositories/taxeType.repository';
import { Accommodation } from './../../shared/entities/accommodation.entity';
import {
  AccommodationRateDto,
  CreateAccommodationDto,
  UpdateAccommodationDto,
} from './../dtos/accommodation.dto';
import { AccommodationRate } from './../../shared/entities/accommodationRate.entity';
import { TenantContext } from '../../tenant/tenant-context.service';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import {
  mapAccommodationDetail,
  AccommodationDetailDto,
  mapMostRequestedAccommodation,
  MostRequestedAccommodationDto,
} from './../../shared/mappers/entity-mappers';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LocalStorageService } from '../../local-storage/services/local-storage.service';
import { TranslationService } from '../../shared/services/translation.service';

@Injectable()
export class AccommodationService {
  constructor(
    private readonly _accommodationRepository: AccommodationRepository,
    private readonly _categoryTypeRepository: CategoryTypeRepository,
    private readonly _bedTypeRepository: BedTypeRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
    private readonly _localStorageService: LocalStorageService,
    private readonly _taxeTypeRepository: TaxeTypeRepository,
    private readonly _translationService: TranslationService,
    private readonly _tenant: TenantContext,
  ) {}

  /** Horas de la tarifa que equivale a `priceSale` (la que usa la facturación). */
  private static readonly BASE_RATE_HOURS = 24;

  /**
   * Tarifas por horas del hospedaje.
   *
   * - Con `rates`: reemplazan a las que había. Si incluyen la de 24 h, esa es
   *   el `priceSale` (el llamador ya lo igualó antes de guardar).
   * - Sin `rates`: la de 24 h sigue al `priceSale`; si el hospedaje no tiene
   *   ninguna tarifa (alta de un hotel como Samawe), se crea esa sola.
   */
  private async _saveRates(
    accommodation: Accommodation,
    rates: AccommodationRateDto[] | undefined,
  ): Promise<void> {
    const repo = this._accommodationRepository.manager.getRepository(AccommodationRate);
    const accommodationId = accommodation.accommodationId;
    const organizational = { organizationalId: this._tenant.requireOrganizationalId() };

    if (rates) {
      await repo
        .createQueryBuilder()
        .delete()
        .where('"accommodationId" = :accommodationId', { accommodationId })
        .execute();
      if (rates.length) {
        await repo.save(
          rates.map((r) => repo.create({ hours: r.hours, price: r.price, accommodation: { accommodationId }, organizational })),
        );
      }
      return;
    }

    const existing = await repo.find({ where: { accommodation: { accommodationId } } });
    const base = existing.find((r) => r.hours === AccommodationService.BASE_RATE_HOURS);
    if (base) {
      if (Number(base.price) !== Number(accommodation.priceSale)) {
        base.price = accommodation.priceSale;
        await repo.save(base);
      }
    } else if (!existing.length) {
      await repo.save(
        repo.create({
          hours: AccommodationService.BASE_RATE_HOURS,
          price: accommodation.priceSale ?? 0,
          accommodation: { accommodationId },
          organizational,
        }),
      );
    }
  }

  /** Horas repetidas en las tarifas -> 400. Devuelve el precio de la de 24 h, si viene. */
  private _validateRates(rates: AccommodationRateDto[] | undefined): number | undefined {
    if (!rates) return undefined;
    const hours = rates.map((r) => r.hours);
    if (new Set(hours).size !== hours.length) {
      throw new BadRequestException('Hay dos tarifas con las mismas horas');
    }
    return rates.find((r) => r.hours === AccommodationService.BASE_RATE_HOURS)?.price;
  }

  async create(
    createAccommodationDto: CreateAccommodationDto,
  ): Promise<Accommodation> {
    // Código único DENTRO del hotel: otro hotel puede usar el mismo.
    const codeExist = await this._accommodationRepository.findOne({
      where: {
        code: createAccommodationDto.code,
        organizational: { organizationalId: this._tenant.requireOrganizationalId() },
      },
    });

    if (codeExist) {
      throw new HttpException('El código ya está en uso', HttpStatus.CONFLICT);
    }
    const basePrice = this._validateRates(createAccommodationDto.rates);

    try {
      const {
        categoryTypeId,
        bedTypeId,
        stateTypeId,
        organizationalId,
        taxeTypeId,
        rates,
        ...accommodationData
      } = createAccommodationDto;
      if (basePrice !== undefined) accommodationData.priceSale = basePrice;

      const categoryType = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId },
      });

      if (!categoryType) {
        throw new BadRequestException('Tipo de categoría no encontrado');
      }

      let organizational = null;
      if (organizationalId) {
        organizational = await this._organizationalRepository.findOne({
          where: { organizationalId },
        });
        if (!organizational) {
          throw new BadRequestException('Organización no encontrada');
        }
      }

      const bedType = await this._bedTypeRepository.findOne({
        where: { bedTypeId },
      });

      if (!bedType) {
        throw new BadRequestException('Tipo de cama no encontrado');
      }

      const stateType = await this._stateTypeRepository.findOne({
        where: { stateTypeId },
      });

      if (!stateType) {
        throw new BadRequestException('Tipo de estado no encontrado');
      }

      let taxeType = null;
      if (taxeTypeId) {
        taxeType = await this._taxeTypeRepository.findOne({
          where: { taxeTypeId },
        });
        if (!taxeType) {
          throw new BadRequestException('Tipo de impuesto no encontrado');
        }
      }

      const name = await this._translationService.toTranslatedField(createAccommodationDto.name);
      const description = createAccommodationDto.description
        ? await this._translationService.toTranslatedField(createAccommodationDto.description)
        : undefined;

      const newAccommodation = this._accommodationRepository.create({
        ...accommodationData,
        name,
        ...(description && { description }),
        categoryType,
        bedType,
        stateType,
        ...(organizational && { organizational }),
        ...(taxeType && { taxeType }),
      });

      const saved = await this._accommodationRepository.save(newAccommodation);
      await this._saveRates(saved, rates);
      return saved;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error creando hospedaje:', error);
      throw new BadRequestException('No se pudo crear el hospedaje');
    }
  }

  async update(
    accommodationId: string,
    updateAccommodationDto: UpdateAccommodationDto,
  ): Promise<Accommodation> {
    const id = parseInt(accommodationId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('El ID del hospedaje debe ser un número');
    }

    const accommodation = await this._accommodationRepository.findOne({
      where: { accommodationId: id },
      relations: ['categoryType', 'stateType', 'bedType'],
    });

    if (!accommodation) {
      throw new NotFoundException(`Hospedaje con ID ${id} no encontrado`);
    }

    const basePrice = this._validateRates(updateAccommodationDto.rates);
    if (updateAccommodationDto.code) {
      const codeExist = await this._accommodationRepository.findOne({
        where: {
          code: updateAccommodationDto.code,
          organizational: { organizationalId: this._tenant.requireOrganizationalId() },
        },
      });
      if (codeExist && codeExist.code !== accommodation.code) {
        throw new ConflictException(
          'El código ya está en uso por otro hospedaje',
        );
      }
    }

    if (updateAccommodationDto.categoryTypeId) {
      const category = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId: updateAccommodationDto.categoryTypeId },
      });

      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }

      accommodation.categoryType = category;
    }

    if (updateAccommodationDto.organizationalId !== undefined) {
      if (updateAccommodationDto.organizationalId === null) {
        accommodation.organizational = null;
      } else {
        const org = await this._organizationalRepository.findOne({
          where: { organizationalId: updateAccommodationDto.organizationalId },
        });
        if (!org) {
          throw new NotFoundException('Organización no encontrada');
        }
        accommodation.organizational = org;
      }
    }

    if (updateAccommodationDto.stateTypeId) {
      const state = await this._stateTypeRepository.findOne({
        where: { stateTypeId: updateAccommodationDto.stateTypeId },
      });

      if (!state) {
        throw new NotFoundException('Estado no encontrado');
      }

      accommodation.stateType = state;
    }

    if (updateAccommodationDto.bedTypeId) {
      const bed = await this._bedTypeRepository.findOne({
        where: { bedTypeId: updateAccommodationDto.bedTypeId },
      });

      if (!bed) {
        throw new NotFoundException('Camas no encontradas');
      }

      accommodation.bedType = bed;
    }

    if (updateAccommodationDto.taxeTypeId !== undefined) {
      if (updateAccommodationDto.taxeTypeId === null) {
        accommodation.taxeType = null;
      } else {
        const taxeType = await this._taxeTypeRepository.findOne({
          where: { taxeTypeId: updateAccommodationDto.taxeTypeId },
        });
        if (!taxeType) {
          throw new NotFoundException('Tipo de impuesto no encontrado');
        }
        accommodation.taxeType = taxeType;
      }
    }

    const { taxeTypeId: _t, name: rawName, description: rawDesc, rates, ...updateData } = updateAccommodationDto;
    if (basePrice !== undefined) updateData.priceSale = basePrice;
    if (rawName) updateData['name'] = await this._translationService.toTranslatedField(rawName);
    // `!== undefined` y no un truthy: la descripción SÍ se puede dejar vacía, y
    // con el truthy el borrado se ignoraba en silencio (el campo volvía a salir
    // con el texto viejo al recargar). `toTranslatedField` ya corta en seco con
    // un string vacío, así que esto no llama a Google Translate.
    if (rawDesc !== undefined) updateData['description'] = await this._translationService.toTranslatedField(rawDesc);
    Object.assign(accommodation, updateData);
    // Las tarifas se escriben aparte: que `save` no intente sincronizar la
    // relación con lo que trajo el `findOne`.
    delete (accommodation as Partial<Accommodation>).rates;

    const saved = await this._accommodationRepository.save(accommodation);
    await this._saveRates(saved, rates);
    return saved;
  }

  async findOne(accommodationId: string): Promise<AccommodationDetailDto> {
    const id = Number(accommodationId);

    if (!Number.isInteger(id)) {
      throw new HttpException(
        'ID del hospedaje inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const accommodation = await this._accommodationRepository.findOne({
      where: { accommodationId: id },
      // 'images' es imprescindible: el panel de edición se alimenta de aquí y
      // el mapper hace `accommodation.images?.map(...)`, así que sin la
      // relación cargada la galería abre vacía aunque las fotos existan.
      relations: ['categoryType', 'bedType', 'stateType', 'taxeType', 'images'],
      order: { images: { position: 'ASC' } },
    });

    if (!accommodation) {
      throw new HttpException('El hospedaje no existe', HttpStatus.NOT_FOUND);
    }

    return mapAccommodationDetail(accommodation);
  }

  async getMostRequested(organizationalId?: string): Promise<MostRequestedAccommodationDto[]> {
    const query = this._invoiceDetaillRepository
      .createQueryBuilder('detail')
      .select('detail.accommodationId', 'accommodationId')
      .addSelect('COUNT(detail.accommodationId)', 'count')
      .innerJoin('detail.accommodation', 'accommodation')
      .where('detail.accommodationId IS NOT NULL');

    if (organizationalId) {
      query.andWhere('accommodation.organizationalId = :organizationalId', { organizationalId });
    }

    const topTwo = await query
      .groupBy('detail.accommodationId')
      .orderBy('count', 'DESC')
      .limit(2)
      .getRawMany();

    const accommodations = await Promise.all(
      topTwo.map(({ accommodationId }) =>
        this._accommodationRepository.findOne({
          where: { accommodationId: Number(accommodationId) },
          relations: ['categoryType', 'bedType', 'stateType', 'images', 'organizational'],
          order: { images: { position: 'ASC' } },
        }),
      ),
    );

    return accommodations
      .filter(Boolean)
      .map((a) => mapMostRequestedAccommodation(a));
  }

  async delete(accommodationId: number): Promise<void> {
    const accommodation = await this.findOne(accommodationId.toString());

    const count = await this._invoiceDetaillRepository.count({
      where: {
        accommodation: { accommodationId },
      },
    });

    if (count > 0) {
      throw new BadRequestException(
        `El hospedaje ${accommodation.name?.['es'] ?? JSON.stringify(accommodation.name)} está asociado a una factura y no puede eliminarse.`,
      );
    }

    const accommodationWithImages = await this._accommodationRepository.findOne({
      where: { accommodationId },
      relations: ['images'],
    });
    if (accommodationWithImages?.images?.length) {
      for (const image of accommodationWithImages.images) {
        await this._localStorageService.deleteImage(image.publicId);
      }
    }

    await this._accommodationRepository.delete(accommodationId);
  }
}
