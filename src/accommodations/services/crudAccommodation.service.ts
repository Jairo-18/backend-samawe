import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { RepositoryService } from '../../shared/services/repositoriry.service';
import { Injectable } from '@nestjs/common';
import {
  PaginatedAccommodationSelectParamsDto,
  PaginatedListAccommodationsParamsDto,
  PartialAccommodationDto,
} from '../dtos/crudAccommodation.dto';
import { ParamsPaginationDto } from '../../shared/dtos/pagination.dto';
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
    const query = this._accommodationRepository
      .createQueryBuilder('accommodation')
      .leftJoinAndSelect('accommodation.categoryType', 'categoryType')
      .leftJoinAndSelect('accommodation.bedType', 'bedType')
      .leftJoinAndSelect('accommodation.stateType', 'stateType')
      .leftJoinAndSelect('accommodation.taxeType', 'taxeType')
      .addSelect(`"accommodation"."name"->>'es'`, 'acc_name_sort')
      .skip(skip)
      .take(params.perPage)
      .orderBy('acc_name_sort', 'ASC');

    if (params.code) {
      query.andWhere('accommodation.code ILIKE :code', { code: `%${params.code}%` });
    }

    if (params.name) {
      query.andWhere(
        `("accommodation"."name"->>'es' ILIKE :name OR "accommodation"."name"->>'en' ILIKE :name)`,
        { name: `%${params.name}%` },
      );
    }

    if (params.description) {
      query.andWhere(
        `("accommodation"."description"->>'es' ILIKE :description OR "accommodation"."description"->>'en' ILIKE :description)`,
        { description: `%${params.description}%` },
      );
    }

    if (params.amountPerson !== undefined) {
      query.andWhere('accommodation.amountPerson = :amountPerson', { amountPerson: params.amountPerson });
    }

    if (params.jacuzzi !== undefined) {
      query.andWhere('accommodation.jacuzzi = :jacuzzi', { jacuzzi: params.jacuzzi });
    }

    if (params.amountRoom !== undefined) {
      query.andWhere('accommodation.amountRoom = :amountRoom', { amountRoom: params.amountRoom });
    }

    if (params.amountBathroom !== undefined) {
      query.andWhere('accommodation.amountBathroom = :amountBathroom', { amountBathroom: params.amountBathroom });
    }

    if (params.priceBuy !== undefined) {
      query.andWhere('accommodation.priceBuy = :priceBuy', { priceBuy: params.priceBuy });
    }

    if (params.priceSale !== undefined) {
      query.andWhere('accommodation.priceSale = :priceSale', { priceSale: params.priceSale });
    }

    if (params.categoryType) {
      query.andWhere('categoryType.categoryTypeId = :categoryTypeId', { categoryTypeId: params.categoryType });
    }

    if (params.bedType) {
      query.andWhere('bedType.bedTypeId = :bedTypeId', { bedTypeId: params.bedType });
    }

    if (params.stateType) {
      query.andWhere('stateType.stateTypeId = :stateTypeId', { stateTypeId: params.stateType });
    }

    if (params.organizationalId) {
      query.andWhere('accommodation.organizationalId = :organizationalId', { organizationalId: params.organizationalId });
    }

    if (params.search) {
      const search = params.search.trim();
      const searchNumber = Number(search);
      const searchClauses = [
        `"accommodation"."name"->>'es' ILIKE :search`,
        `"accommodation"."name"->>'en' ILIKE :search`,
        `"accommodation"."description"->>'es' ILIKE :search`,
        `"accommodation"."description"->>'en' ILIKE :search`,
        `"accommodation"."code" ILIKE :search`,
      ];
      if (!isNaN(searchNumber)) {
        searchClauses.push(
          `accommodation.amountPerson = :searchNum`,
          `accommodation.amountRoom = :searchNum`,
          `accommodation.amountBathroom = :searchNum`,
          `accommodation.priceBuy = :searchNum`,
          `accommodation.priceSale = :searchNum`,
        );
        query.andWhere(
          `(${searchClauses.join(' OR ')})`,
          { search: `%${search}%`, searchNum: searchNumber },
        );
      } else {
        query.andWhere(`(${searchClauses.join(' OR ')})`, { search: `%${search}%` });
      }
    }

    const [entities, itemCount] = await query.getManyAndCount();

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

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: params });
    return new ResponsePaginationDto(accommodations, pageMetaDto);
  }

  async paginatedPublicList(
    params: ParamsPaginationDto,
  ): Promise<ResponsePaginationDto<AccommodationPublicListItem>> {
    const skip = (params.page - 1) * params.perPage;
    const query = this._accommodationRepository
      .createQueryBuilder('accommodation')
      .leftJoinAndSelect('accommodation.categoryType', 'categoryType')
      .leftJoinAndSelect('accommodation.bedType', 'bedType')
      .leftJoinAndSelect('accommodation.stateType', 'stateType')
      .leftJoinAndSelect('accommodation.images', 'images')
      .addSelect(`"accommodation"."name"->>'es'`, 'acc_name_sort')
      .skip(skip)
      .take(params.perPage)
      .orderBy('acc_name_sort', params.order ?? 'ASC');

    const [entities, itemCount] = await query.getManyAndCount();

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
    const query = this._accommodationRepository
      .createQueryBuilder('accommodation')
      .select(["accommodation.accommodationId", "accommodation.name"])
      .addSelect(`"accommodation"."name"->>'es'`, 'acc_name_sort')
      .skip(skip)
      .take(params.perPage)
      .orderBy('acc_name_sort', params.order ?? 'ASC');

    if (params.organizationalId) {
      query.andWhere('accommodation.organizationalId = :organizationalId', {
        organizationalId: params.organizationalId,
      });
    }

    if (params.search) {
      const search = params.search.trim();
      query.andWhere(
        `("accommodation"."name"->>'es' ILIKE :search OR "accommodation"."name"->>'en' ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const [entities, itemCount] = await query.getManyAndCount();

    const items: PartialAccommodationDto[] = entities.map((e) => ({
      name: e.name,
    }));

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: params });
    return new ResponsePaginationDto(items, pageMetaDto);
  }
}
