import {
  PaginatedListUsersParamsDto,
  PaginatedUserSelectParamsDto,
} from '../dtos/crudUser.dto';
import { CrudUserService } from '../services/crudUser.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudUserUC {
  constructor(private _crudUserService: CrudUserService) {}

  async getRelatedDataToCreate(isRegister: boolean) {
    return await this._crudUserService.getRelatedDataToCreate(isRegister);
  }

  async paginatedList(params: PaginatedListUsersParamsDto) {
    return await this._crudUserService.paginatedList(params);
  }

  async paginatedPartialUser(params: PaginatedUserSelectParamsDto) {
    return await this._crudUserService.paginatedUserSelect(params);
  }
}
