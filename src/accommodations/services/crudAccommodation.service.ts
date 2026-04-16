import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { Accommodation } from './../../shared/entities/accommodation.entity';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { RepositoryService } from '../../shared/services/repositoriry.service';
import { Injectable } from '@nestjs/common';
import {
  PaginatedAccommodationSelectParamsDto,
  PaginatedListAccommodationsParamsDto,
  PartialAccommodationDto,
} from '../dtos/crudAccommodation.dto';
import { ParamsPaginationDto } from '../../shared/dtos/pagination.dto';
import { Equal, FindOptionsWhere, ILike } from 'typeorm';
import {
  AccommodationInterfacePaginatedList,
  AccommodationPublicListItem,
} from '../interface/accommodation.interface';

@Injectable()
export class CrudAccommodationService {
  constructor(
    private readonly _repositoriesService: RepositoryService,
    private readonly _accommodationRepository: AccommodationRepository,
  ) {}

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

    if (params.organizationalId) {
      baseConditions.organizational = {
        organizationalId: params.organizationalId,
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
        where.push({
          ...baseConditions,
          ...condition,
          ...(params.organizationalId && {
            organizational: { organizationalId: params.organizationalId },
          }),
        });
      });
    } else {
      where.push({
        ...baseConditions,
        ...(params.organizationalId && {
          organizational: { organizationalId: params.organizationalId },
        }),
      });
    }

    const [entities, itemCount] =
      await this._accommodationRepository.findAndCount({
        where,
        skip,
        take: params.perPage,
        order: { name: 'ASC' },
        relations: ['categoryType', 'bedType', 'stateType', 'taxeType'],
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
        taxeType: accommodation.taxeType
          ? {
              taxeTypeId: accommodation.taxeType.taxeTypeId,
              percentage: accommodation.taxeType.percentage,
              name: accommodation.taxeType.name,
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

  async paginatedPublicList(
    params: ParamsPaginationDto,
  ): Promise<ResponsePaginationDto<AccommodationPublicListItem>> {
    const skip = (params.page - 1) * params.perPage;

    const [entities, itemCount] =
      await this._accommodationRepository.findAndCount({
        skip,
        take: params.perPage,
        order: { name: params.order ?? 'ASC' },
        relations: ['categoryType', 'bedType', 'stateType', 'images'],
      });

    const items: AccommodationPublicListItem[] = entities.map((a) => ({
      accommodationId: a.accommodationId,
      name: a.name,
      description: a.description,
      amountPerson: a.amountPerson,
      amountRoom: a.amountRoom,
      amountBathroom: a.amountBathroom,
      jacuzzi: a.jacuzzi,
      priceSale: a.priceSale,
      categoryType: a.categoryType
        ? {
            categoryTypeId: a.categoryType.categoryTypeId,
            code: a.categoryType.code,
            name: a.categoryType.name,
          }
        : null,
      bedType: a.bedType
        ? {
            bedTypeId: a.bedType.bedTypeId,
            code: a.bedType.code,
            name: a.bedType.name,
          }
        : null,
      stateType: a.stateType
        ? {
            stateTypeId: a.stateType.stateTypeId,
            code: a.stateType.code,
            name: a.stateType.name,
          }
        : null,
      images:
        a.images?.map((img) => ({
          accommodationImageId: img.accommodationImageId,
          imageUrl: img.imageUrl,
          publicId: img.publicId,
        })) ?? [],
    }));

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: params });
    return new ResponsePaginationDto(items, pageMetaDto);
  }

  async paginatedPartialAccommodations(
    params: PaginatedAccommodationSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialAccommodationDto>> {
    const skip = (params.page - 1) * params.perPage;
    const where = [];

    if (params.search) {
      const search = params.search.trim();
      where.push({
        name: ILike(`%${search}%`),
        ...(params.organizationalId && {
          organizational: { organizationalId: params.organizationalId },
        }),
      });
    } else {
      where.push({
        ...(params.organizationalId && {
          organizational: { organizationalId: params.organizationalId },
        }),
      });
    }

    const [entities, itemCount] =
      await this._accommodationRepository.findAndCount({
        where,
        skip,
        take: params.perPage,
        order: { name: params.order ?? 'ASC' },
        select: ['name'],
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
