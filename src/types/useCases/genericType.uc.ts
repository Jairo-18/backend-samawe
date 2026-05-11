import { Injectable } from '@nestjs/common';
import { GenericTypeService } from './../services/genericType.service';
import { RepositoryService } from './../../shared/services/repositoriry.service';
import { ResponsePaginationDto } from 'src/shared/dtos/pagination.dto';
import { DeepPartial } from 'typeorm';
import { ParamsPaginationGenericDto, Type } from '../dtos/genericType.dto';
import { TranslationService } from '../../shared/services/translation.service';

@Injectable()
export class GenericTypeUC<T extends object> {
  constructor(
    private readonly genericTypeService: GenericTypeService<T>,
    private readonly _repositoryService: RepositoryService,
    private readonly _translationService: TranslationService,
  ) {}

  private async translateNameField(dto: DeepPartial<T>): Promise<DeepPartial<T>> {
    const d = dto as any;
    if (d.name && typeof d.name === 'object' && d.name.es && !d.name.en) {
      d.name = await this._translationService.toTranslatedField({ es: d.name.es });
    }
    return dto;
  }

  async createWithValidationAndGetId(
    type: string,
    dto: DeepPartial<T>,
  ): Promise<string> {
    return await this.genericTypeService.createWithValidationAndGetId(
      type,
      await this.translateNameField(dto),
    );
  }

  async create(type: string, dto: DeepPartial<T>): Promise<T> {
    return await this.genericTypeService.create(type, await this.translateNameField(dto));
  }

  async findOneByTypeAndId(type: string, id: string): Promise<Type> {
    return this.genericTypeService.findOneByTypeAndId(type, id);
  }

  async findOne(type: string, id: number | string): Promise<T> {
    return await this.genericTypeService.findOneByType(type, id);
  }

  async update(
    type: string,
    id: string | number,
    data: DeepPartial<T>,
  ): Promise<void> {
    await this.genericTypeService.updateByType(type, id, await this.translateNameField(data));
  }

  async delete(type: string, id: number | string): Promise<void> {
    await this.genericTypeService.deleteByType(type, id);
  }

  async paginatedList(
    params: ParamsPaginationGenericDto,
    type: string,
  ): Promise<ResponsePaginationDto<T>> {
    return await this.genericTypeService.paginatedList(params, type);
  }

  async getAll(type: string): Promise<T[]> {
    return await this.genericTypeService.findAllByType(type);
  }
}
