import { RepositoryService } from '../../shared/services/repositoriry.service';
import { Role } from '../../shared/entities/role.entity';
import { IdentificationType } from '../../shared/entities/identificationType.entity';
import { Injectable } from '@nestjs/common';
import { CreateUserRelatedDataDto } from '../dtos/crudUser.dto';

@Injectable()
export class CrudUserService {
  constructor(private readonly _repositoriesService: RepositoryService) {}

  async getRelatedDataToCreate(
    isRegister: boolean,
  ): Promise<CreateUserRelatedDataDto> {
    const identificationType =
      await this._repositoriesService.getEntities<IdentificationType>(
        this._repositoriesService.repositories.identificationType,
      );
    if (!isRegister) {
      const role = await this._repositoriesService.getEntities<Role>(
        this._repositoriesService.repositories.role,
      );
      return { identificationType, role };
    }
    return { identificationType };
  }
}
