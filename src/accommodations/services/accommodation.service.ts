import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { StateTypeRepository } from './../../shared/repositories/stateType.repository';
import { BedTypeRepository } from './../../shared/repositories/bedType.repository';
import { CategoryTypeRepository } from './../../shared/repositories/categoryType.repository';
import { Accommodation } from './../../shared/entities/accommodation.entity';
import {
  CreateAccommodationDto,
  UpdateAccommodationDto,
} from './../dtos/accommodation.dto';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class AccommodationService {
  constructor(
    private readonly _accommodationRepository: AccommodationRepository,
    private readonly _categoryTypeRepository: CategoryTypeRepository,
    private readonly _bedTypeRepository: BedTypeRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
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
      const { categoryTypeId, bedTypeId, stateTypeId, ...accommodationData } =
        createAccommodationDto;

      // Cargar relaciones
      const categoryType = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId },
      });

      if (!categoryType) {
        throw new BadRequestException('Tipo de categoría no encontrado');
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

      const newAccommodation = this._accommodationRepository.create({
        ...accommodationData,
        categoryType,
        bedType,
        stateType,
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

    // Validar si el código nuevo ya está en uso por otro hospedaje
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

    // Validar y actualizar categoría si se envía
    if (updateAccommodationDto.categoryTypeId) {
      const category = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId: updateAccommodationDto.categoryTypeId },
      });

      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }

      accommodation.categoryType = category;
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

    Object.assign(accommodation, updateAccommodationDto);

    return await this._accommodationRepository.save(accommodation);
  }

  async findOne(accommodationId: string): Promise<Accommodation> {
    const id = Number(accommodationId);

    if (!Number.isInteger(id)) {
      throw new HttpException(
        'ID del hospedaje inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const accommodation = await this._accommodationRepository.findOne({
      where: { accommodationId: id },
      relations: ['categoryType', 'bedType', 'stateType'],
    });

    if (!accommodation) {
      throw new HttpException('El hospedaje no existe', HttpStatus.NOT_FOUND);
    }

    return accommodation;
  }

  async findAll(): Promise<Accommodation[]> {
    return await this._accommodationRepository.find();
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

    await this._accommodationRepository.delete(accommodationId);
  }
}
