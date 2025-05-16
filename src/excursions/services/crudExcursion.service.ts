import { StateType } from './../../shared/entities/stateType.entity';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { RepositoryService } from './../../shared/services/repositoriry.service';
import { Injectable } from '@nestjs/common';
import { CreateExcursionRelatedDataDto } from '../dtos/crudExcursion.dto';

@Injectable()
export class CrudExcursionService {
  constructor(private readonly _repositoriesService: RepositoryService) {}

  async getRelatedDataToCreate(): Promise<CreateExcursionRelatedDataDto> {
    const categoryType =
      await this._repositoriesService.getEntities<CategoryType>(
        this._repositoriesService.repositories.categoryType,
      );

    const stateType = await this._repositoriesService.getEntities<StateType>(
      this._repositoriesService.repositories.stateType,
    );

    return { categoryType, stateType };
  }
}
