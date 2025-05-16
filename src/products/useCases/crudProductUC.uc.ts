import { PaginatedListProductsParamsDto } from '../dtos/crudProduct.dto';
import { CrudProductService } from '../services/crudProduct.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudProductUC {
  constructor(private _crudProductService: CrudProductService) {}

  async getRelatedDataToCreate() {
    return await this._crudProductService.getRelatedDataToCreate();
  }

  async paginatedList(params: PaginatedListProductsParamsDto) {
    return await this._crudProductService.paginatedList(params);
  }
}
