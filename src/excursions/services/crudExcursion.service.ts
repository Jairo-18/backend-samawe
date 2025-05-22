import { Excursion } from './../../shared/entities/excursion.entity';
import { PaginatedListExcursionsParamsDto } from './../dtos/crudExcursion.dto';
import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { StateType } from './../../shared/entities/stateType.entity';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { RepositoryService } from './../../shared/services/repositoriry.service';
import { Injectable } from '@nestjs/common';
import { CreateExcursionRelatedDataDto } from '../dtos/crudExcursion.dto';
import { Equal, FindOptionsWhere, ILike } from 'typeorm';

@Injectable()
export class CrudExcursionService {
  constructor(
    private readonly _repositoriesService: RepositoryService,
    private readonly _excursionRepository: ExcursionRepository,
  ) {}

  async getRelatedDataToCreate(): Promise<CreateExcursionRelatedDataDto> {
    const categoryType =
      await this._repositoriesService.getEntities<CategoryType>(
        this._repositoriesService.repositories.categoryType,
      );

    const stateType = await this._repositoriesService.getEntities<StateType>(
      this._repositoriesService.repositories.stateType,
    );

    return { categoryType, stateType };
  }

  async paginatedList(params: PaginatedListExcursionsParamsDto) {
    const skip = (params.page - 1) * params.perPage;
    const where: FindOptionsWhere<Excursion>[] = [];

    const baseConditions: FindOptionsWhere<Excursion> = {};

    if (params.code) {
      baseConditions.code = ILike(`%${params.code}%`);
    }

    if (params.name) {
      baseConditions.name = ILike(`%${params.name}%`);
    }

    if (params.description) {
      baseConditions.description = ILike(`%${params.description}%`);
    }

    if (params.priceBuy !== undefined) {
      baseConditions.priceBuy = Equal(params.priceBuy);
    }

    if (params.priceSale !== undefined) {
      baseConditions.priceSale = Equal(params.priceSale);
    }

    if (params.stateType) {
      baseConditions.stateType = { stateTypeId: params.stateType };
    }

    if (params.categoryType) {
      baseConditions.categoryType = {
        categoryTypeId: params.categoryType,
      };
    }

    // Búsqueda global
    if (params.search) {
      const search = params.search.trim();
      const searchConditions: FindOptionsWhere<Excursion>[] = [
        { name: ILike(`%${search}%`) },
        { description: ILike(`%${search}%`) },
        { code: ILike(`%${search}%`) },
      ];

      const searchNumber = Number(search);
      if (!isNaN(searchNumber)) {
        searchConditions.push(
          { priceBuy: Equal(searchNumber) },
          { priceSale: Equal(searchNumber) },
        );
      }

      searchConditions.forEach((condition) => {
        where.push({ ...baseConditions, ...condition });
      });
    } else {
      where.push(baseConditions);
    }

    const [entities, itemCount] = await this._excursionRepository.findAndCount({
      where,
      skip,
      take: params.perPage,
      order: { createdAt: params.order ?? 'DESC' },
      relations: ['categoryType', 'stateType'],
    });

    const excursions = entities.map((excursion) => ({
      ...excursion,
      categoryTypeId: excursion.categoryType?.categoryTypeId,
      stateTypeId: excursion.stateType?.stateTypeId,
    }));

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(excursions, pageMetaDto);
  }
}
