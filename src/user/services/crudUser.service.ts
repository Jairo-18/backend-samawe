import { PhoneCode } from './../../shared/entities/phoneCode.entity';
import { RepositoryService } from '../../shared/services/repositoriry.service';
import { RoleType } from '../../shared/entities/roleType.entity';
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

    const phoneCode = await this._repositoriesService.getEntities<PhoneCode>(
      this._repositoriesService.repositories.phoneCode,
    );

    if (!isRegister) {
      const roleType = await this._repositoriesService.getEntities<RoleType>(
        this._repositoriesService.repositories.roleType,
      );
      return { identificationType, roleType, phoneCode };
    }

    return { identificationType, phoneCode };
  }
}
