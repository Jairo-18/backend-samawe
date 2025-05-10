import { TaxeType } from './../../shared/entities/taxeType.entity';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { CreateProductRelatedDataDto } from './../dtos/crudProduct.dto';
import { RepositoryService } from '../../shared/services/repositoriry.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudProductService {
  constructor(private readonly _repositoriesService: RepositoryService) {}

  async getRelatedDataToCreate(): Promise<CreateProductRelatedDataDto> {
    const categoryType =
      await this._repositoriesService.getEntities<CategoryType>(
        this._repositoriesService.repositories.categoryType,
      );

    const taxeType = await this._repositoriesService.getEntities<TaxeType>(
      this._repositoriesService.repositories.taxeType,
    );

    return { categoryType, taxeType };
  }
}
