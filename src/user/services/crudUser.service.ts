import { User } from './../../shared/entities/user.entity';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { UserRepository } from './../../shared/repositories/user.repository';
import { PhoneCode } from './../../shared/entities/phoneCode.entity';
import { RepositoryService } from '../../shared/services/repositoriry.service';
import { RoleType } from '../../shared/entities/roleType.entity';
import { IdentificationType } from '../../shared/entities/identificationType.entity';
import { Injectable } from '@nestjs/common';
import {
  CreateUserRelatedDataDto,
  PaginatedListUsersParamsDto,
  PaginatedUserSelectParamsDto,
} from '../dtos/crudUser.dto';
import { Equal, FindOptionsWhere, ILike } from 'typeorm';

@Injectable()
export class CrudUserService {
  constructor(
    private readonly _repositoriesService: RepositoryService,
    private readonly _userRepository: UserRepository,
  ) {}

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

  async paginatedList(params: PaginatedListUsersParamsDto) {
    const skip = (params.page - 1) * params.perPage;
    const where: FindOptionsWhere<User>[] = [];

    const baseConditions: FindOptionsWhere<User> = {};

    if (params.identificationNumber) {
      baseConditions.identificationNumber = ILike(
        `%${params.identificationNumber}%`,
      );
    }

    if (params.email) {
      baseConditions.email = ILike(`%${params.email}%`);
    }

    if (params.firstName) {
      baseConditions.firstName = ILike(`%${params.firstName}%`);
    }

    if (params.lastName) {
      baseConditions.lastName = ILike(`%${params.lastName}%`);
    }

    if (params.phone) {
      baseConditions.phone = ILike(`%${params.phone}%`);
    }

    if (params.roleType) {
      baseConditions.roleType = { roleTypeId: params.roleType };
    }

    //cuando viene por id o uuid se hace asi
    if (params.identificationType) {
      baseConditions.identificationType = {
        identificationTypeId: params.identificationType,
      };
    }

    if (params.isActive !== undefined) {
      baseConditions.isActive = Equal(params.isActive);
    }

    if (params.phoneCode) {
      baseConditions.phoneCode = {
        phoneCodeId: params.phoneCode,
      };
    }

    // Búsqueda global
    if (params.search) {
      const searchConditions: FindOptionsWhere<User>[] = [
        { firstName: ILike(`%${params.search}%`) },
        { lastName: ILike(`%${params.search}%`) },
        { email: ILike(`%${params.search}%`) },
        { identificationNumber: ILike(`%${params.search}%`) },
        { phone: ILike(`%${params.search}%`) },
      ];

      // Combinar condiciones base con cada condición de búsqueda
      searchConditions.forEach((condition) => {
        where.push({ ...baseConditions, ...condition });
      });
    } else {
      where.push(baseConditions);
    }

    const [entities, itemCount] = await this._userRepository.findAndCount({
      where,
      skip,
      take: params.perPage,
      order: { createdAt: params.order ?? 'DESC' },
      relations: ['roleType', 'identificationType', 'phoneCode'],
    });

    const users = entities.map((user) => {
      const newUser = {
        ...user,
        roleTypeId: user?.roleType?.roleTypeId,
        identificationTypeId: user?.identificationType?.identificationTypeId,
        phoneCodeId: user?.phoneCode?.phoneCodeId,
      };

      return newUser;
    });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(users, pageMetaDto);
  }

  async paginatedUserSelect(params: PaginatedUserSelectParamsDto) {
    const skip = (params.page - 1) * params.perPage;

    const where = [];

    if (params.search) {
      const term = `%${params.search.trim()}%`;

      where.push(
        { firstName: ILike(term) },
        { lastName: ILike(term) },
        { identificationNumber: ILike(term) },
      );
    }

    const [users, itemCount] = await this._userRepository.findAndCount({
      where: where.length ? where : undefined,
      skip,
      take: params.perPage,
      order: { firstName: 'ASC' },
      select: [
        'userId',
        'firstName',
        'lastName',
        'identificationNumber',
        'isActive',
      ],
    });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(users, pageMetaDto);
  }
}
