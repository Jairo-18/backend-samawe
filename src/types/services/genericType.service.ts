import { RepositoryService } from './../../shared/services/repositoriry.service';
import { Repository, DeepPartial } from 'typeorm';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResponsePaginationDto } from 'src/shared/dtos/pagination.dto';
import { PageMetaDto } from 'src/shared/dtos/pageMeta.dto';
import { OrderConst } from 'src/shared/constants/order.constants';
import { ParamsPaginationGenericDto } from '../dtos/genericType.dto';

@Injectable()
export class GenericTypeService<T extends object> {
  constructor(
    private readonly _repository: Repository<T>,
    private readonly repositoryService: RepositoryService,
  ) {}

  get repository(): Repository<T> {
    return this._repository;
  }

  async createWithValidation(type: string, data: DeepPartial<T>): Promise<T> {
    // Validar duplicado sólo con el campo code porque type es solo para el mensaje
    const existing = await this._repository.findOne({
      where: { code: (data as any).code },
    } as any);

    if (existing) {
      throw new ConflictException(
        `El registro con code "${(data as any).code}" ya existe en ${type}.`,
      );
    }
    return this.create(data);
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this._repository.create(data);
    return this._repository.save(entity);
  }

  async findAll(): Promise<T[]> {
    return this._repository.find();
  }

  static async findAllTypesFromRepositories(
    repositories: Record<string, Repository<any>>,
    repositoryService: RepositoryService,
  ): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};

    for (const [typeName, repository] of Object.entries(repositories)) {
      const service = new GenericTypeService(repository, repositoryService);
      const data = await service.findAll();
      result[typeName] = data;
    }

    return result;
  }

  async findOne(id: number | string): Promise<T> {
    return this._repository.findOne({ where: { id } as any });
  }

  async update(id: string | number, data: DeepPartial<T>): Promise<void> {
    // Validaciones previas, por ejemplo código duplicado
    if ('code' in data) {
      const existing = await this._repository.findOne({
        where: { code: (data as any).code },
      } as any);
      if (existing && (existing as any).id !== id) {
        throw new ConflictException(
          `El código "${(data as any).code}" ya está en uso.`,
        );
      }
    }

    // Actualizar el registro, sin devolver nada
    await this._repository.update(id, data as any);
  }

  async delete(id: number | string): Promise<void> {
    const primaryColumn =
      this._repository.metadata.primaryColumns[0].propertyName;

    // Verificar existencia
    const existing = await this._repository.findOne({
      where: { [primaryColumn]: id } as any,
    });

    if (!existing) {
      throw new NotFoundException(
        `Registro con ${primaryColumn}="${id}" no encontrado.`,
      );
    }

    await this._repository.delete({ [primaryColumn]: id } as any);
  }

  async paginatedList(
    params: ParamsPaginationGenericDto,
    type: string,
  ): Promise<ResponsePaginationDto<T>> {
    const skip = (params.page - 1) * params.perPage;
    const take = params.perPage;

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

    const idField = idFieldByEntity[type] ?? 'id';

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

    const validOrderFields = orderFieldsByEntity[type] || [];
    const defaultOrderField = validOrderFields[0] ?? idField;

    const orderField =
      params.orderBy && validOrderFields.includes(params.orderBy)
        ? params.orderBy
        : defaultOrderField;

    const orderDirection = params.order ?? OrderConst.DESC;

    const repository = this.repositoryService.repositories[
      type
    ] as Repository<T>;

    if (!repository) {
      throw new Error(`Repository for type "${type}" not found`);
    }

    const qb = repository.createQueryBuilder('entity');

    // Simplificación de filtros
    const filters: string[] = [];
    const paramsWhere: Record<string, any> = {};

    if (params.name && params.name.trim()) {
      filters.push('entity.name ILIKE :name');
      paramsWhere.name = `%${params.name.trim()}%`;
    }

    if (params.code && params.code.trim()) {
      filters.push('entity.code ILIKE :code');
      paramsWhere.code = `%${params.code.trim()}%`;
    }

    if (params.search && params.search.trim()) {
      if (!params.name && !params.code) {
        filters.push(
          '(entity.name ILIKE :search OR entity.code ILIKE :search)',
        );
        paramsWhere.search = `%${params.search.trim()}%`;

        if (!isNaN(Number(params.search.trim()))) {
          filters.push(`entity.${idField} = :idSearch`);
          paramsWhere.idSearch = Number(params.search.trim());
        }
      }
    }

    if (filters.length > 0) {
      qb.andWhere(filters.join(' AND '), paramsWhere);
    }

    qb.skip(skip).take(take);
    qb.orderBy(`entity.${orderField}`, orderDirection);

    const [items, total] = await qb.getManyAndCount();

    const meta = new PageMetaDto({ itemCount: total, pageOptionsDto: params });

    return new ResponsePaginationDto<T>(items, meta);
  }
}
