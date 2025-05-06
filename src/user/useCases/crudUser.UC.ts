import { PaginatedListUsersParamsDto } from '../dtos/crudUser.dto';
import { CrudUserService } from './../services/crudUser.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudUserUseCase {
  constructor(private userService: CrudUserService) {}

  async getRelatedDataToCreate(isRegister: boolean) {
    return await this.userService.getRelatedDataToCreate(isRegister);
  }

  async paginatedList(params: PaginatedListUsersParamsDto) {
    return await this.userService.paginatedList(params);
  }
}
