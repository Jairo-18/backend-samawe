import { CrudExcursionService } from './../services/crudExcursion.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudExcursionUC {
  constructor(private readonly _crudExcursionService: CrudExcursionService) {}

  async getRelatedDataToCreate() {
    return await this._crudExcursionService.getRelatedDataToCreate();
  }
}
