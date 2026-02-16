import {
  PaginatedExcursionSelectParamsDto,
  PaginatedListExcursionsParamsDto,
} from './../dtos/crudExcursion.dto';
import { CrudExcursionService } from './../services/crudExcursion.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudExcursionUC {
  constructor(private readonly _crudExcursionService: CrudExcursionService) {}

  async paginatedList(params: PaginatedListExcursionsParamsDto) {
    return await this._crudExcursionService.paginatedList(params);
  }

  async paginatedPartialExcursion(params: PaginatedExcursionSelectParamsDto) {
    return await this._crudExcursionService.paginatedPartialExcursions(params);
  }
}
