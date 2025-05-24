import { GenericTypeService } from './../services/genericType.service';
import { Injectable } from '@nestjs/common';
import { ResponsePaginationDto } from 'src/shared/dtos/pagination.dto';
import { DeepPartial } from 'typeorm';
import { ParamsPaginationGenericDto } from '../dtos/genericType.dto';

@Injectable()
export class GenericTypeUC<T extends object> {
  constructor(private readonly _genericTypeService: GenericTypeService<T>) {}

  async createWithValidation(
    type: string,
    dto: DeepPartial<T>,
  ): Promise<string> {
    const created = await this._genericTypeService.createWithValidation(
      type,
      dto,
    );

    const primaryKey =
      this._genericTypeService['_repository'].metadata.primaryColumns[0]
        .propertyName;

    // Retornamos solo el valor del id como string
    return (created as any)[primaryKey]?.toString() || '';
  }

  create(dto: DeepPartial<T>) {
    return this._genericTypeService.create(dto);
  }

  findAll() {
    return this._genericTypeService.findAll();
  }

  findOne(id: number | string) {
    return this._genericTypeService.findOne(id);
  }

  async update(id: string | number, data: DeepPartial<T>): Promise<void> {
    // Aquí haces la validación y actualización en la BD
    await this._genericTypeService.update(id, data);
  }

  async delete(id: number | string): Promise<void> {
    await this._genericTypeService.delete(id);
  }

  async paginatedList(
    params: ParamsPaginationGenericDto,
    type: string,
  ): Promise<ResponsePaginationDto<T>> {
    return this._genericTypeService.paginatedList(params, type);
  }
}
