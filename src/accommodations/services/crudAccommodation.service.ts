import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { Accommodation } from './../../shared/entities/accommodation.entity';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { BedType } from './../../shared/entities/bedType.entity';
import { StateType } from './../../shared/entities/stateType.entity';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { RepositoryService } from '../../shared/services/repositoriry.service';
import { Injectable } from '@nestjs/common';
import {
  CreateRelatedDataServicesAndProductsDto,
  PaginatedAccommodationSelectParamsDto,
  PaginatedListAccommodationsParamsDto,
  PartialAccommodationDto,
} from '../dtos/crudAccommodation.dto';
import { Equal, FindOptionsWhere, ILike } from 'typeorm';
import { AccommodationInterfacePaginatedList } from '../interface/accommodation.interface';

@Injectable()
export class CrudAccommodationService {
  constructor(
    private readonly _repositoriesService: RepositoryService,
    private readonly _accommodationRepository: AccommodationRepository,
  ) {}

  async getRelatedDataToCreate(): Promise<CreateRelatedDataServicesAndProductsDto> {
    const categoryType =
      await this._repositoriesService.getEntities<CategoryType>(
        this._repositoriesService.repositories.categoryType,
      );

    const stateType = await this._repositoriesService.getEntities<StateType>(
      this._repositoriesService.repositories.stateType,
    );

    const bedType = await this._repositoriesService.getEntities<BedType>(
      this._repositoriesService.repositories.bedType,
    );

    return { categoryType, stateType, bedType };
  }

  async paginatedList(params: PaginatedListAccommodationsParamsDto) {
    const skip = (params.page - 1) * params.perPage;
    const where: FindOptionsWhere<Accommodation>[] = [];

    const baseConditions: FindOptionsWhere<Accommodation> = {};

    if (params.code !== undefined) {
      baseConditions.code = ILike(`%${params.code}%`);
    }

    if (params.name) {
      baseConditions.name = ILike(`%${params.name}%`);
    }

    if (params.description) {
      baseConditions.description = ILike(`%${params.description}%`);
    }

    if (params.amountPerson !== undefined) {
      baseConditions.amountPerson = Equal(params.amountPerson);
    }

    if (params.jacuzzi !== undefined) {
      baseConditions.jacuzzi = params.jacuzzi;
    }

    if (params.amountRoom !== undefined) {
      baseConditions.amountRoom = Equal(params.amountRoom);
    }

    if (params.amountBathroom !== undefined) {
      baseConditions.amountBathroom = Equal(params.amountBathroom);
    }

    if (params.priceBuy !== undefined) {
      baseConditions.priceBuy = Equal(params.priceBuy);
    }

    if (params.priceSale !== undefined) {
      baseConditions.priceSale = Equal(params.priceSale);
    }

    if (params.categoryType) {
      baseConditions.categoryType = {
        categoryTypeId: params.categoryType,
      };
    }

    if (params.bedType) {
      baseConditions.bedType = {
        bedTypeId: params.bedType,
      };
    }

    if (params.stateType) {
      baseConditions.stateType = {
        stateTypeId: params.stateType,
      };
    }
    // Búsqueda global
    if (params.search) {
      const search = params.search.trim();
      const searchConditions: FindOptionsWhere<Accommodation>[] = [
        { name: ILike(`%${search}%`) },
        { description: ILike(`%${search}%`) },
        { code: ILike(`%${search}%`) },
      ];

      const searchNumber = Number(search);
      if (!isNaN(searchNumber)) {
        searchConditions.push(
          { amountPerson: Equal(searchNumber) },
          { amountRoom: Equal(searchNumber) },
          { amountBathroom: Equal(searchNumber) },
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

    const [entities, itemCount] =
      await this._accommodationRepository.findAndCount({
        where,
        skip,
        take: params.perPage,
        order: { createdAt: params.order ?? 'DESC' },
        relations: ['categoryType', 'bedType', 'stateType'],
      });

    const accommodations: AccommodationInterfacePaginatedList[] = entities.map(
      (accommodation) => ({
        accommodationId: accommodation.accommodationId,
        code: accommodation.code,
        name: accommodation.name,
        description: accommodation.description,
        amountPerson: accommodation.amountPerson,
        jacuzzi: accommodation.jacuzzi,
        amountRoom: accommodation.amountRoom,
        amountBathroom: accommodation.amountBathroom,
        priceBuy: accommodation.priceBuy,
        priceSale: accommodation.priceSale,
        categoryType: accommodation.categoryType
          ? {
              categoryTypeId: accommodation.categoryType.categoryTypeId,
              code: accommodation.categoryType.code,
              name: accommodation.categoryType.name,
            }
          : null,
        bedType: accommodation.bedType
          ? {
              bedTypeId: accommodation.bedType.bedTypeId,
              code: accommodation.bedType.code,
              name: accommodation.bedType.name,
            }
          : null,
        stateType: accommodation.stateType
          ? {
              stateTypeId: accommodation.stateType.stateTypeId,
              code: accommodation.stateType.code,
              name: accommodation.stateType.name,
            }
          : null,
        images:
          accommodation.images?.map((img) => ({
            accommodationImageId: img.accommodationImageId,
            imageUrl: img.imageUrl,
            publicId: img.publicId,
          })) || [],
      }),
    );

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(accommodations, pageMetaDto);
  }

  async paginatedPartialAccommodations(
    params: PaginatedAccommodationSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialAccommodationDto>> {
    const skip = (params.page - 1) * params.perPage;
    const where = [];

    if (params.search) {
      const search = params.search.trim();
      where.push({ name: ILike(`%${search}%`) });
    } else {
      where.push({});
    }

    const [entities, itemCount] =
      await this._accommodationRepository.findAndCount({
        where,
        skip,
        take: params.perPage,
        order: { name: params.order ?? 'ASC' },
        select: ['name'], // solo nombre
      });

    const items: PartialAccommodationDto[] = entities.map((e) => ({
      name: e.name!,
    }));

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(items, pageMetaDto);
  }
}
