import {
  PaginatedListProductsParamsDto,
  PaginatedProductSelectParamsDto,
} from '../dtos/crudProduct.dto';
import { CrudProductService } from '../services/crudProduct.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudProductUC {
  constructor(private _crudProductService: CrudProductService) {}

  async paginatedList(params: PaginatedListProductsParamsDto) {
    return await this._crudProductService.paginatedList(params);
  }

  async paginatedPartialProduct(params: PaginatedProductSelectParamsDto) {
    return await this._crudProductService.paginatedPartialProducts(params);
  }
}
