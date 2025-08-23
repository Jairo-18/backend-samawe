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
      invoiceType: 'invoiceTypeId',
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
      roleType: ['name', 'code', 'roleTypeId'],
      invoiceType: ['name', 'code', 'invoiceTypeId'],
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
      invoiceType: 'invoiceTypeId',
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
  // Agregar este método privado a la clase GenericTypeService
  private getReferencingEntitiesForType(
    type: string,
  ): { entity: string; field: string }[] {
    // Define qué entidades referencian cada tipo basado en tu contexto real
    const referencingEntitiesMap: Record<
      string,
      { entity: string; field: string }[]
    > = {
      roleType: [{ entity: 'User', field: 'roleTypeId' }],
      phoneCode: [{ entity: 'User', field: 'phoneCodeId' }],
      payType: [{ entity: 'Invoice', field: 'payTypeId' }],
      invoiceType: [{ entity: 'Invoice', field: 'invoiceTypeId' }],
      paidType: [{ entity: 'Invoice', field: 'paidTypeId' }],
      additionalType: [
        // No se usa en ninguna entidad según tu contexto
      ],
      bedType: [{ entity: 'Accommodation', field: 'bedTypeId' }],
      categoryType: [
        { entity: 'Product', field: 'categoryTypeId' },
        { entity: 'Accommodation', field: 'categoryTypeId' },
        { entity: 'Excursion', field: 'categoryTypeId' },
      ],
      identificationType: [{ entity: 'User', field: 'identificationTypeId' }],
      stateType: [
        { entity: 'Excursion', field: 'stateTypeId' },
        { entity: 'Accommodation', field: 'stateTypeId' },
      ],
      taxeType: [
        { entity: 'InvoiceDetail', field: 'taxeTypeId' },
        { entity: 'Invoice', field: 'taxeTypeId' },
      ],
    };

    return referencingEntitiesMap[type] || [];
  }

  // Método para verificar si un tipo está siendo usado
  private async checkIfTypeIsInUse(
    type: string,
    id: string | number,
  ): Promise<void> {
    const referencingEntities = this.getReferencingEntitiesForType(type);

    if (referencingEntities.length === 0) {
      // Si no hay entidades que referencien este tipo, permitir eliminación
      return;
    }

    const usageDetails: string[] = [];

    for (const { entity, field } of referencingEntities) {
      try {
        // Obtener el repositorio del tipo para hacer la consulta directamente
        const typeRepository = this.getRepositoryByType(type);

        // Usar QueryBuilder para hacer una consulta más flexible
        const queryBuilder = typeRepository.manager.createQueryBuilder();

        // Construir la consulta para verificar referencias
        const count = await queryBuilder
          .select('COUNT(*)')
          .from(entity, 'e')
          .where(`e.${field} = :id`, { id })
          .getRawOne()
          .then((result) => parseInt(result.count) || 0);

        if (count > 0) {
          usageDetails.push(`${count} registro(s) en ${entity}`);
        }
      } catch (error) {
        console.error(
          `❌ Error verificando referencias en ${entity}:`,
          error.message,
        );

        // Si hay error con QueryBuilder, intentar una consulta SQL directa
        try {
          const typeRepository = this.getRepositoryByType(type);
          const result = await typeRepository.manager.query(
            `SELECT COUNT(*) as count FROM "${entity}" WHERE "${field}" = $1`,
            [id],
          );

          const count = parseInt(result[0]?.count) || 0;

          if (count > 0) {
            usageDetails.push(`${count} registro(s) en ${entity}`);
          }
        } catch (sqlError) {
          console.error(
            `❌ Error con SQL directo para ${entity}:`,
            sqlError.message,
          );
        }
      }
    }

    if (usageDetails.length > 0) {
      throw new ConflictException(
        `No se puede eliminar este ${type} porque está siendo usado por: ${usageDetails.join(', ')}`,
      );
    }
  }

  // Modificar el método deleteByType existente
  async deleteByType(type: string, id: number | string): Promise<void> {
    const repository = this.getRepositoryByType(type);
    const primaryColumn = this.getPrimaryKeyField(repository);

    // Verificar que el registro existe
    const existing = await repository.findOne({
      where: { [primaryColumn]: id } as any,
    });

    if (!existing) {
      throw new NotFoundException(
        `Registro con ${primaryColumn}="${id}" no encontrado.`,
      );
    }

    // Verificar si está siendo usado antes de eliminar
    await this.checkIfTypeIsInUse(type, id);

    // Si pasa todas las validaciones, proceder con la eliminación
    await repository.delete({ [primaryColumn]: id } as any);
  }

  // Método adicional para verificar uso sin eliminar (útil para la UI)
  async checkTypeUsage(
    type: string,
    id: number | string,
  ): Promise<{
    canDelete: boolean;
    usageDetails: string[];
  }> {
    const referencingEntities = this.getReferencingEntitiesForType(type);

    if (referencingEntities.length === 0) {
      return { canDelete: true, usageDetails: [] };
    }

    const usageDetails: string[] = [];

    for (const { entity, field } of referencingEntities) {
      try {
        const entityRepository =
          this.repositoryService.repositories[entity.toLowerCase()];

        if (entityRepository) {
          const count = await entityRepository.count({
            where: { [field]: id },
          });

          if (count > 0) {
            usageDetails.push(`${count} registro(s) en ${entity}`);
          }
        }
      } catch (error) {
        console.warn(
          `No se pudo verificar referencias en ${entity}:`,
          error.message,
        );
      }
    }

    return {
      canDelete: usageDetails.length === 0,
      usageDetails,
    };
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
