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

  async paginatedPublicList(params: ParamsPaginationDto) {
    return await this._crudAccommodationService.paginatedPublicList(params);
  }
}
