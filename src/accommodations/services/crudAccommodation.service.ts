import { BedType } from './../../shared/entities/bedType.entity';
import { StateType } from './../../shared/entities/stateType.entity';
import { CategoryType } from './../../shared/entities/categoryType.entity';
import { RepositoryService } from '../../shared/services/repositoriry.service';
import { Injectable } from '@nestjs/common';
import { CreateAccommodationRelatedDataDto } from '../dtos/crudAccommodation.dto';

@Injectable()
export class CrudAccommodationService {
  constructor(private readonly _repositoriesService: RepositoryService) {}

  async getRelatedDataToCreate(): Promise<CreateAccommodationRelatedDataDto> {
    const categoryType =
      await this._repositoriesService.getEntities<CategoryType>(
        this._repositoriesService.repositories.categoryType,
      );

    const stateType = await this._repositoriesService.getEntities<StateType>(
      this._repositoriesService.repositories.stateType,
    );

    const bedType = await this._repositoriesService.getEntities<BedType>(
      this._repositoriesService.repositories.bedType,
    );

    return { categoryType, stateType, bedType };
  }
}
