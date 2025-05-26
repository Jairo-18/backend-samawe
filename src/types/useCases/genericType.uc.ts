import { GenericTypeService } from './../services/genericType.service';
import { Injectable } from '@nestjs/common';
import { ResponsePaginationDto } from 'src/shared/dtos/pagination.dto';
import { DeepPartial } from 'typeorm';
import { ParamsPaginationGenericDto, Type } from '../dtos/genericType.dto';

@Injectable()
export class GenericTypeUC<T extends object> {
  constructor(private readonly genericTypeService: GenericTypeService<T>) {}

  async createWithValidation(
    type: string,
    dto: DeepPartial<T>,
  ): Promise<string> {
    return await this.genericTypeService.createWithValidationAndGetId(
      type,
      dto,
    );
  }

  async create(type: string, dto: DeepPartial<T>): Promise<T> {
    return await this.genericTypeService.create(type, dto);
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
    await this.genericTypeService.updateByType(type, id, data);
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

  // async getMultiplePaginatedTypes(
  //   params: ParamsPaginationGenericDto,
  //   typesParam?: string,
  // ): Promise<{
  //   data: MultiplePaginatedResponse;
  //   typesCount: number;
  // }> {
  //   return await this.genericTypeService.getMultiplePaginatedTypesWithProcessing(
  //     params,
  //     typesParam,
  //   );
  // }

  // async getAvailableTypesWithCount(): Promise<{
  //   types: string[];
  //   count: number;
  // }> {
  //   return await this.genericTypeService.getAvailableTypesWithCount();
  // }

  // async getAllTypes(): Promise<string[]> {
  //   return this.genericTypeService.getAvailableTypes();
  // }
}
