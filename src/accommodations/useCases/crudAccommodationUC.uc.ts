import {
  PaginatedAccommodationSelectParamsDto,
  PaginatedListAccommodationsParamsDto,
} from './../dtos/crudAccommodation.dto';
import { CrudAccommodationService } from '../services/crudAccommodation.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudAccommodationUC {
  constructor(private _crudAccommodationService: CrudAccommodationService) {}

  async getRelatedDataToCreate() {
    return await this._crudAccommodationService.getRelatedDataToCreate();
  }

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
}
