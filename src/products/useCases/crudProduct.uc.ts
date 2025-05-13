import { PaginatedListProductsParamsDto } from './../dtos/crudProduct.dto';
import { CrudProductService } from './../services/crudProduct.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudProductUseCase {
  constructor(private productService: CrudProductService) {}

  async getRelatedDataToCreate() {
    return await this.productService.getRelatedDataToCreate();
  }

  async paginatedList(params: PaginatedListProductsParamsDto) {
    return await this.productService.paginatedList(params);
  }
}
