import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { OrderConst } from './../../shared/constants/order.constants';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { RepositoryService } from './../../shared/services/repositoriry.service';
import { Repository, DeepPartial } from 'typeorm';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ParamsPaginationGenericDto, Type } from '../dtos/genericType.dto';

@Injectable()
export class GenericTypeService<T extends object> {
  constructor(private readonly repositoryService: RepositoryService) {}

  private getRepositoryByType(type: string): Repository<any> {
    const repository = this.repositoryService.repositories[type];
    if (!repository) {
      throw new NotFoundException(`Tipo "${type}" no válido`);
    }
    return repository;
  }

  private getPrimaryKeyField(repository: Repository<any>): string {
    return repository.metadata.primaryColumns[0].propertyName;
  }

  private getIdFieldByType(type: string): string {
    const idFieldByEntity: Record<string, string> = {
      roleType: 'roleTypeId',
      phoneCode: 'phoneCodeId',
      payType: 'payTypeId',
      paidType: 'paidTypeId',
      additionalType: 'additionalTypeId',
      bedType: 'bedTypeId',
      categoryType: 'categoryTypeId',
      identificationType: 'identificationTypeId',
      stateType: 'stateTypeId',
      taxeType: 'taxeTypeId',
    };
    return idFieldByEntity[type] ?? 'id';
  }

  private getOrderFieldsByType(type: string): string[] {
    const orderFieldsByEntity: Record<string, string[]> = {
      phoneCode: ['code', 'name', 'phoneCodeId'],
      product: ['createdAt', 'name', 'priceBuy', 'priceSale'],
      roleType: ['name', 'code', 'roleTypeId'],
      payType: ['name', 'code', 'payTypeId'],
      paidType: ['name', 'code', 'paidTypeId'],
      additionalType: ['name', 'code', 'additionalTypeId'],
      bedType: ['name', 'code', 'bedTypeId'],
      categoryType: ['name', 'code', 'categoryTypeId'],
      identificationType: ['name', 'code', 'identificationTypeId'],
      stateType: ['name', 'code', 'stateTypeId'],
      taxeType: ['name', 'code', 'taxeTypeId'],
    };
    return orderFieldsByEntity[type] || [];
  }

  // private processTypesParam(typesParam?: string): string[] {
  //   return (
  //     typesParam?.split(',').map((t) => t.trim()) || this.getAvailableTypes()
  //   );
  // }

  async createWithValidation(type: string, data: DeepPartial<T>): Promise<T> {
    const repository = this.getRepositoryByType(type);
    const existing = await repository.findOne({
      where: { code: (data as any).code },
    });

    if (existing) {
      throw new ConflictException(
        `El registro con code "${(data as any).code}" ya existe en ${type}.`,
      );
    }

    const entity = repository.create(data);
    return repository.save(entity);
  }

  async createWithValidationAndGetId(
    type: string,
    data: DeepPartial<T>,
  ): Promise<string> {
    const created = await this.createWithValidation(type, data);
    const repository = this.getRepositoryByType(type);
    const primaryKey = this.getPrimaryKeyField(repository);
    return (created as any)[primaryKey]?.toString() || '';
  }

  async create(type: string, data: DeepPartial<T>): Promise<T> {
    const repository = this.getRepositoryByType(type);
    const entity = repository.create(data);
    return repository.save(entity);
  }

  async findOneByTypeAndId(type: string, id: string): Promise<Type | null> {
    const repo = this.getRepositoryByType(type);
    const primaryKey = this.getPrimaryKeyForType(type);

    return await repo.findOneBy({ [primaryKey]: id });
  }

  private getPrimaryKeyForType(type: string): string {
    const map: Record<string, string> = {
      additionalType: 'additionalTypeId',
      bedType: 'bedTypeId',
      categoryType: 'categoryTypeId',
      identificationType: 'identificationTypeId',
      paidType: 'paidTypeId',
      payType: 'payTypeId',
      phoneCode: 'phoneCodeId',
      roleType: 'roleTypeId',
      stateType: 'stateTypeId',
      taxeType: 'taxeTypeId',
    };

    const key = map[type];
    if (!key) {
      throw new Error(`No se definió clave primaria para el tipo: ${type}`);
    }

    return key;
  }

  async findOneByType(type: string, id: number | string): Promise<T> {
    const repository = this.getRepositoryByType(type);
    return repository.findOne({ where: { id } as any });
  }

  async updateByType(
    type: string,
    id: string | number,
    data: DeepPartial<T>,
  ): Promise<void> {
    const repository = this.getRepositoryByType(type);

    if ('code' in data) {
      const existing = await repository.findOne({
        where: { code: (data as any).code },
      });

      // Solo lanzar error si existe otro registro con ese código Y no es el mismo que estamos actualizando
      if (existing && existing.id && existing.id.toString() !== id.toString()) {
        throw new ConflictException(
          `El código "${(data as any).code}" ya está en uso.`,
        );
      }
    }

    await repository.update(id, data as any);
  }

  async deleteByType(type: string, id: number | string): Promise<void> {
    const repository = this.getRepositoryByType(type);
    const primaryColumn = this.getPrimaryKeyField(repository);
    const existing = await repository.findOne({
      where: { [primaryColumn]: id } as any,
    });

    if (!existing) {
      throw new NotFoundException(
        `Registro con ${primaryColumn}="${id}" no encontrado.`,
      );
    }

    await repository.delete({ [primaryColumn]: id } as any);
  }

  async paginatedList(
    params: ParamsPaginationGenericDto,
    type: string,
  ): Promise<ResponsePaginationDto<T>> {
    const repository = this.getRepositoryByType(type);
    const skip = (params.page - 1) * params.perPage;
    const take = params.perPage;

    const idField = this.getIdFieldByType(type);
    const validOrderFields = this.getOrderFieldsByType(type);
    const orderField =
      params.orderBy && validOrderFields.includes(params.orderBy)
        ? params.orderBy
        : (validOrderFields[0] ?? idField);

    const qb = repository.createQueryBuilder('entity');
    this.applyFilters(qb, params, idField);

    qb.skip(skip).take(take);
    qb.orderBy(`entity.${orderField}`, params.order ?? OrderConst.DESC);

    const [items, total] = await qb.getManyAndCount();
    const meta = new PageMetaDto({ itemCount: total, pageOptionsDto: params });

    return new ResponsePaginationDto<T>(items, meta);
  }

  private applyFilters(
    qb: any,
    params: ParamsPaginationGenericDto,
    idField: string,
  ): void {
    const filters: string[] = [];
    const paramsWhere: Record<string, any> = {};

    if (params.name?.trim()) {
      filters.push('entity.name ILIKE :name');
      paramsWhere.name = `%${params.name.trim()}%`;
    }

    if (params.code?.trim()) {
      filters.push('entity.code ILIKE :code');
      paramsWhere.code = `%${params.code.trim()}%`;
    }

    if (params.search?.trim() && !params.name && !params.code) {
      filters.push('(entity.name ILIKE :search OR entity.code ILIKE :search)');
      paramsWhere.search = `%${params.search.trim()}%`;

      if (!isNaN(Number(params.search.trim()))) {
        filters.push(`entity.${idField} = :idSearch`);
        paramsWhere.idSearch = Number(params.search.trim());
      }
    }

    if (filters.length > 0) {
      qb.andWhere(filters.join(' AND '), paramsWhere);
    }
  }

  // async getMultiplePaginatedTypes(
  //   types: string[],
  //   params: ParamsPaginationGenericDto,
  // ): Promise<MultiplePaginatedResponse> {
  //   const repositories = this.repositoryService.repositories;
  //   const invalidTypes = types.filter((type) => !repositories[type]);
  //   if (invalidTypes.length) {
  //     throw new NotFoundException(
  //       `Tipos no válidos: ${invalidTypes.join(', ')}`,
  //     );
  //   }

  //   const promises = types.map(async (type) => {
  //     const data = await this.paginatedList(params, type);
  //     return [type, data] as [string, ResponsePaginationDto<any>];
  //   });

  //   const results = await Promise.all(promises);
  //   return Object.fromEntries(results);
  // }

  // async getMultiplePaginatedTypesWithProcessing(
  //   params: ParamsPaginationGenericDto,
  //   typesParam?: string,
  // ): Promise<{
  //   data: MultiplePaginatedResponse;
  //   typesCount: number;
  // }> {
  //   const types = this.processTypesParam(typesParam);
  //   const data = await this.getMultiplePaginatedTypes(types, params);
  //   return { data, typesCount: types.length };
  // }

  // getAvailableTypes(): string[] {
  //   return Object.keys(this.repositoryService.repositories);
  // }

  // getAvailableTypesWithCount(): { types: string[]; count: number } {
  //   const types = this.getAvailableTypes();
  //   return { types, count: types.length };
  // }
}
