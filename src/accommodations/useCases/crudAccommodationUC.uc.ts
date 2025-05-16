import { CrudAccommodationService } from '../services/crudAccommodation.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudAccommodationUC {
  constructor(private _crudAccommodationService: CrudAccommodationService) {}

  async getRelatedDataToCreate() {
    return await this._crudAccommodationService.getRelatedDataToCreate();
  }
}
