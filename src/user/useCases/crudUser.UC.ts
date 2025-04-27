import { Injectable } from '@nestjs/common';
import { CrudUserService } from '../services/user/crudUser.service';

@Injectable()
export class CrudUserUseCase {
  constructor(private userService: CrudUserService) {}

  async getRelatedDataToCreate(isRegister: boolean) {
    return await this.userService.getRelatedDataToCreate(isRegister);
  }
}
