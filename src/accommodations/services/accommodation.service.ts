import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { StateTypeRepository } from './../../shared/repositories/stateType.repository';
import { OrganizationalRepository } from './../../shared/repositories/organizational.repository';
import { BedTypeRepository } from './../../shared/repositories/bedType.repository';
import { CategoryTypeRepository } from './../../shared/repositories/categoryType.repository';
import { TaxeTypeRepository } from './../../shared/repositories/taxeType.repository';
import { Accommodation } from './../../shared/entities/accommodation.entity';
import {
  CreateAccommodationDto,
  UpdateAccommodationDto,
} from './../dtos/accommodation.dto';
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
  ) {}

  async create(
    createAccommodationDto: CreateAccommodationDto,
  ): Promise<Accommodation> {
    const codeExist = await this._accommodationRepository.findOne({
      where: { code: createAccommodationDto.code },
    });

    if (codeExist) {
      throw new HttpException('El código ya está en uso', HttpStatus.CONFLICT);
    }

    try {
      const {
        categoryTypeId,
        bedTypeId,
        stateTypeId,
        organizationalId,
        taxeTypeId,
        ...accommodationData
      } = createAccommodationDto;

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

      const newAccommodation = this._accommodationRepository.create({
        ...accommodationData,
        categoryType,
        bedType,
        stateType,
        ...(organizational && { organizational }),
        ...(taxeType && { taxeType }),
      });

      return await this._accommodationRepository.save(newAccommodation);
    } catch (error) {
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

    if (updateAccommodationDto.code) {
      const codeExist = await this._accommodationRepository.findOne({
        where: { code: updateAccommodationDto.code },
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

    const { taxeTypeId: _t, ...updateData } = updateAccommodationDto;
    Object.assign(accommodation, updateData);

    return await this._accommodationRepository.save(accommodation);
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
      relations: ['categoryType', 'bedType', 'stateType', 'taxeType'],
    });

    if (!accommodation) {
      throw new HttpException('El hospedaje no existe', HttpStatus.NOT_FOUND);
    }

    return mapAccommodationDetail(accommodation);
  }

  async getMostRequested(): Promise<MostRequestedAccommodationDto[]> {
    const topTwo = await this._invoiceDetaillRepository
      .createQueryBuilder('detail')
      .select('detail.accommodationId', 'accommodationId')
      .addSelect('COUNT(detail.accommodationId)', 'count')
      .where('detail.accommodationId IS NOT NULL')
      .groupBy('detail.accommodationId')
      .orderBy('count', 'DESC')
      .limit(2)
      .getRawMany();

    const accommodations = await Promise.all(
      topTwo.map(({ accommodationId }) =>
        this._accommodationRepository.findOne({
          where: { accommodationId: Number(accommodationId) },
          relations: ['categoryType', 'bedType', 'stateType', 'images'],
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
        `El hospedaje ${accommodation.name} está asociado a una factura y no puede eliminarse.`,
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
