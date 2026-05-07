import { Excursion } from './../../shared/entities/excursion.entity';
import {
  PaginatedExcursionSelectParamsDto,
  PaginatedListExcursionsParamsDto,
  PartialExcursionDto,
} from './../dtos/crudExcursion.dto';
import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { RepositoryService } from './../../shared/services/repositoriry.service';
import { Injectable } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';

@Injectable()
export class CrudExcursionService {
  constructor(
    private readonly _repositoriesService: RepositoryService,
    private readonly _excursionRepository: ExcursionRepository,
  ) {}

  async findAll(organizationalId?: string) {
    const query = this._excursionRepository
      .createQueryBuilder('excursion')
      .leftJoinAndSelect('excursion.categoryType', 'categoryType')
      .leftJoinAndSelect('excursion.stateType', 'stateType')
      .leftJoinAndSelect('excursion.taxeType', 'taxeType')
      .addSelect(`"categoryType"."name"->>'es'`, 'cat_name_sort')
      .addSelect(`"excursion"."name"->>'es'`, 'exc_name_sort')
      .orderBy('cat_name_sort', 'ASC')
      .addOrderBy('exc_name_sort', 'ASC');
    if (organizationalId) {
      query.andWhere('excursion.organizationalId = :organizationalId', { organizationalId });
    }
    const entities = await query.getMany();
    return {
      data: {
        excursions: entities.map((e) => ({
          excursionId: e.excursionId,
          code: e.code,
          name: e.name,
          description: e.description,
          priceBuy: e.priceBuy,
          priceSale: e.priceSale,
          categoryType: e.categoryType ?? null,
          stateType: e.stateType ?? null,
          taxeType: e.taxeType ?? null,
          images: e.images?.map((img) => ({
            excursionImageId: img.excursionImageId,
            imageUrl: img.imageUrl,
            publicId: img.publicId,
          })) ?? [],
        })),
      },
    };
  }

  async paginatedList(params: PaginatedListExcursionsParamsDto) {
    const skip = (params.page - 1) * params.perPage;
    const query = this._excursionRepository
      .createQueryBuilder('excursion')
      .leftJoinAndSelect('excursion.categoryType', 'categoryType')
      .leftJoinAndSelect('excursion.stateType', 'stateType')
      .leftJoinAndSelect('excursion.taxeType', 'taxeType')
      .addSelect(`"excursion"."name"->>'es'`, 'exc_name_sort')
      .skip(skip)
      .take(params.perPage)
      .orderBy('exc_name_sort', 'ASC');

    if (params.code) {
      query.andWhere('excursion.code ILIKE :code', { code: `%${params.code}%` });
    }

    if (params.name) {
      query.andWhere(
        `("excursion"."name"->>'es' ILIKE :name OR "excursion"."name"->>'en' ILIKE :name)`,
        { name: `%${params.name}%` },
      );
    }

    if (params.description) {
      query.andWhere(
        `("excursion"."description"->>'es' ILIKE :description OR "excursion"."description"->>'en' ILIKE :description)`,
        { description: `%${params.description}%` },
      );
    }

    if (params.priceBuy !== undefined) {
      query.andWhere('excursion.priceBuy = :priceBuy', { priceBuy: params.priceBuy });
    }

    if (params.priceSale !== undefined) {
      query.andWhere('excursion.priceSale = :priceSale', { priceSale: params.priceSale });
    }

    if (params.stateType) {
      query.andWhere('stateType.stateTypeId = :stateTypeId', { stateTypeId: params.stateType });
    }

    if (params.categoryType) {
      query.andWhere('categoryType.categoryTypeId = :categoryTypeId', { categoryTypeId: params.categoryType });
    }

    if (params.organizationalId) {
      query.andWhere('excursion.organizationalId = :organizationalId', { organizationalId: params.organizationalId });
    }

    if (params.search) {
      const search = params.search.trim();
      const searchNumber = Number(search);
      const searchClauses = [
        `"excursion"."name"->>'es' ILIKE :search`,
        `"excursion"."name"->>'en' ILIKE :search`,
        `"excursion"."description"->>'es' ILIKE :search`,
        `"excursion"."description"->>'en' ILIKE :search`,
        `"excursion"."code" ILIKE :search`,
      ];
      if (!isNaN(searchNumber)) {
        searchClauses.push(
          `excursion.priceBuy = :searchNum`,
          `excursion.priceSale = :searchNum`,
        );
        query.andWhere(`(${searchClauses.join(' OR ')})`, { search: `%${search}%`, searchNum: searchNumber });
      } else {
        query.andWhere(`(${searchClauses.join(' OR ')})`, { search: `%${search}%` });
      }
    }

    const [entities, itemCount] = await query.getManyAndCount();

    const excursions = entities.map((excursion) => ({
      excursionId: excursion.excursionId,
      code: excursion.code,
      name: excursion.name,
      description: excursion.description,
      priceBuy: excursion.priceBuy,
      priceSale: excursion.priceSale,
      categoryType: excursion.categoryType
        ? {
            categoryTypeId: excursion.categoryType.categoryTypeId,
            code: excursion.categoryType.code,
            name: excursion.categoryType.name,
          }
        : null,
      stateType: excursion.stateType
        ? {
            stateTypeId: excursion.stateType.stateTypeId,
            code: excursion.stateType.code,
            name: excursion.stateType.name,
          }
        : null,
      taxeType: excursion.taxeType
        ? {
            taxeTypeId: excursion.taxeType.taxeTypeId,
            percentage: excursion.taxeType.percentage,
            name: excursion.taxeType.name,
          }
        : null,
      images:
        excursion.images?.map((img) => ({
          excursionImageId: img.excursionImageId,
          imageUrl: img.imageUrl,
          publicId: img.publicId,
        })) || [],
    }));

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: params });
    return new ResponsePaginationDto(excursions, pageMetaDto);
  }

  async paginatedPartialExcursions(
    params: PaginatedExcursionSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialExcursionDto>> {
    const skip = (params.page - 1) * params.perPage;
    const query = this._excursionRepository
      .createQueryBuilder('excursion')
      .select(['excursion.excursionId', 'excursion.name'])
      .addSelect(`"excursion"."name"->>'es'`, 'exc_name_sort')
      .skip(skip)
      .take(params.perPage)
      .orderBy('exc_name_sort', params.order ?? 'ASC');

    if (params.organizationalId) {
      query.andWhere('excursion.organizationalId = :organizationalId', {
        organizationalId: params.organizationalId,
      });
    }

    if (params.search) {
      const search = params.search.trim();
      query.andWhere(
        `("excursion"."name"->>'es' ILIKE :search OR "excursion"."name"->>'en' ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const [entities, itemCount] = await query.getManyAndCount();

    const items: PartialExcursionDto[] = entities.map((e) => ({
      name: e.name,
    }));

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: params });
    return new ResponsePaginationDto(items, pageMetaDto);
  }
}
