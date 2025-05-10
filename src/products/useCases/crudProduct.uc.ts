import { CrudProductService } from './../services/crudProduct.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudProductUseCase {
  constructor(private productService: CrudProductService) {}

  async getRelatedDataToCreate() {
    return await this.productService.getRelatedDataToCreate();
  }
}
