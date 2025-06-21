import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { StateTypeRepository } from './../../shared/repositories/stateType.repository';
import { CategoryTypeRepository } from './../../shared/repositories/categoryType.repository';
import {
  CreateExcursionDto,
  UpdateExcursionDto,
} from './../dtos/excursion.dto';
import { Excursion } from './../../shared/entities/excursion.entity';
import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class ExcursionService {
  constructor(
    private readonly _excursionRepository: ExcursionRepository,
    private readonly _categoryTypeRepository: CategoryTypeRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
  ) {}

  async create(createExcursionDto: CreateExcursionDto): Promise<Excursion> {
    const codeExist = await this._excursionRepository.findOne({
      where: { code: createExcursionDto.code },
    });

    if (codeExist) {
      throw new HttpException('El código ya está en uso', HttpStatus.CONFLICT);
    }

    try {
      const { categoryTypeId, stateTypeId, ...excursionData } =
        createExcursionDto;

      // Cargar relaciones
      const categoryType = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId },
      });

      if (!categoryType) {
        throw new BadRequestException('Tipo de categoría no encontrado');
      }

      const stateType = await this._stateTypeRepository.findOne({
        where: { stateTypeId },
      });

      if (!stateType) {
        throw new BadRequestException('Tipo de estado no encontrado');
      }

      const newExcursion = this._excursionRepository.create({
        ...excursionData,
        categoryType,
        stateType,
      });

      return await this._excursionRepository.save(newExcursion);
    } catch (error) {
      console.error('Error creando pasadía:', error);
      throw new BadRequestException('No se pudo crear la pasadía');
    }
  }

  async update(
    excursionId: string,
    updateExcursionDto: UpdateExcursionDto,
  ): Promise<Excursion> {
    const id = parseInt(excursionId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('El ID de la pasadía debe ser un número');
    }

    const excursion = await this._excursionRepository.findOne({
      where: { excursionId: id },
      relations: ['categoryType', 'stateType'],
    });

    if (!excursion) {
      throw new NotFoundException(`Pasadía con ID ${id} no encontrado`);
    }

    if (updateExcursionDto.code) {
      const codeExist = await this._excursionRepository.findOne({
        where: { code: updateExcursionDto.code },
      });
      // Verifica si el código existe y pertenece a un registro diferente
      if (codeExist && codeExist.code !== excursion.code) {
        throw new ConflictException(
          'El código ya está en uso por otra pasadía',
        );
      }
    }

    // Actualizar relaciones si se enviaron
    if (updateExcursionDto.stateTypeId) {
      const state = await this._stateTypeRepository.findOne({
        where: { stateTypeId: updateExcursionDto.stateTypeId },
      });

      if (!state) {
        throw new NotFoundException('Estado no encontrado');
      }

      excursion.stateType = state;
      delete updateExcursionDto.stateTypeId;
    }

    if (updateExcursionDto.categoryTypeId) {
      const category = await this._categoryTypeRepository.findOne({
        where: { categoryTypeId: updateExcursionDto.categoryTypeId },
      });

      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }

      excursion.categoryType = category;
      delete updateExcursionDto.categoryTypeId;
    }

    // Aplicar otras actualizaciones
    Object.assign(excursion, updateExcursionDto);

    return await this._excursionRepository.save(excursion);
  }

  async findOne(excursionId: string): Promise<Excursion> {
    const id = Number(excursionId);

    if (!Number.isInteger(id)) {
      throw new HttpException(
        'ID de la pasadía es inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const excursion = await this._excursionRepository.findOne({
      where: { excursionId: id },
      relations: ['categoryType', 'stateType'],
    });

    if (!excursion) {
      throw new HttpException('La pasadía no existe', HttpStatus.NOT_FOUND);
    }

    return excursion;
  }

  async findAll(): Promise<Excursion[]> {
    return await this._excursionRepository.find();
  }

  async delete(excursionId: number): Promise<void> {
    const excursion = await this.findOne(excursionId.toString());

    const count = await this._invoiceDetaillRepository.count({
      where: {
        excursion: { excursionId },
      },
    });

    if (count > 0) {
      throw new BadRequestException(
        `La excursión ${excursion.name} está asociada a una factura y no puede eliminarse.`,
      );
    }

    await this._excursionRepository.delete(excursionId);
  }
}
