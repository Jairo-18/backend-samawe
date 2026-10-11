import {
  PaginatedAccommodationSelectParamsDto,
  PaginatedListAccommodationsParamsDto,
} from './../dtos/crudAccommodation.dto';
import { ParamsPaginationDto } from '../../shared/dtos/pagination.dto';
import { CrudAccommodationService } from '../services/crudAccommodation.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudAccommodationUC {
  constructor(private _crudAccommodationService: CrudAccommodationService) {}

  async paginatedList(params: PaginatedListAccommodationsParamsDto) {
    return await this._crudAccommodationService.paginatedList(params);
  }

  async paginatedPartialAccommodation(
    params: PaginatedAccommodationSelectParamsDto,
  ) {
    return await this._crudAccommodationService.paginatedPartialAccommodations(
      params,
    );
  }

  async paginatedPublicList(params: ParamsPaginationDto, organizationalId: string) {
    return await this._crudAccommodationService.paginatedPublicList(params, organizationalId);
  }

  async publicDetail(accommodationId: number, organizationalId: string) {
    return await this._crudAccommodationService.publicDetail(accommodationId, organizationalId);
  }

  async publicOccupiedRanges(
    accommodationId: number,
    from: Date,
    to: Date,
    organizationalId: string,
  ) {
    return await this._crudAccommodationService.publicOccupiedRanges(
      accommodationId,
      from,
      to,
      organizationalId,
    );
  }
}
