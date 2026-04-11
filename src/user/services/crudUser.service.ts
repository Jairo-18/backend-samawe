import { User } from './../../shared/entities/user.entity';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { UserRepository } from './../../shared/repositories/user.repository';
import { PhoneCode } from './../../shared/entities/phoneCode.entity';
import { RepositoryService } from '../../shared/services/repositoriry.service';
import { Injectable } from '@nestjs/common';
import {
  PaginatedCodePhoneUser,
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

    if (params.personType) {
      baseConditions.personType = {
        personTypeId: Number(params.personType),
      };
    }

    if (params.search) {
      const searchConditions: FindOptionsWhere<User>[] = [
        { firstName: ILike(`%${params.search}%`) },
        { lastName: ILike(`%${params.search}%`) },
        { email: ILike(`%${params.search}%`) },
        { identificationNumber: ILike(`%${params.search}%`) },
        { phone: ILike(`%${params.search}%`) },
      ];

      searchConditions.forEach((condition) => {
        where.push({
          ...baseConditions,
          ...condition,
          ...(params.organizationalId && {
            organizational: { organizationalId: params.organizationalId },
          }),
        });
      });
    } else {
      where.push({
        ...baseConditions,
        ...(params.organizationalId && {
          organizational: { organizationalId: params.organizationalId },
        }),
      });
    }

    const [entities, itemCount] = await this._userRepository.findAndCount({
      where,
      skip,
      take: params.perPage,
      order: { firstName: 'ASC', lastName: 'ASC' },
      relations: [
        'roleType',
        'identificationType',
        'phoneCode',
        'personType',
        'organizational',
      ],
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        identificationNumber: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const users = entities.map((user) => {
      const { organizational, ...rest } = user;
      return {
        ...rest,
        roleTypeId: user?.roleType?.roleTypeId,
        identificationTypeId: user?.identificationType?.identificationTypeId,
        phoneCodeId: user?.phoneCode?.phoneCodeId,
        personTypeId: user?.personType?.personTypeId,
        organizationalId: organizational?.organizationalId,
      };
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
      const orgFilter = params.organizationalId
        ? { organizational: { organizationalId: params.organizationalId } }
        : {};

      where.push(
        { firstName: ILike(term), ...orgFilter },
        { lastName: ILike(term), ...orgFilter },
        { identificationNumber: ILike(term), ...orgFilter },
        { email: ILike(term), ...orgFilter },
      );
    } else if (params.organizationalId) {
      where.push({
        organizational: { organizationalId: params.organizationalId },
      });
    }

    const [users, itemCount] = await this._userRepository.findAndCount({
      where: where.length ? where : undefined,
      skip,
      take: params.perPage,
      order: { firstName: 'ASC', lastName: 'ASC' },
      relations: ['organizational'],
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        identificationNumber: true,
        isActive: true,
      },
    });

    const mappedUsers = users.map((u) => {
      const { organizational, ...rest } = u;
      return {
        ...rest,
        organizationalId: organizational?.organizationalId,
      };
    });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(mappedUsers, pageMetaDto);
  }

  async paginatedPhoneCodeSelect(params: PaginatedCodePhoneUser) {
    const skip = (params.page - 1) * params.perPage;

    const where: FindOptionsWhere<PhoneCode>[] = [];

    if (params.search) {
      const term = `%${params.search.trim()}%`;

      where.push({ code: ILike(term) }, { name: ILike(term) });
    }

    const [phoneCodes, itemCount] =
      await this._repositoriesService.repositories.phoneCode.findAndCount({
        where: where.length ? where : undefined,
        skip,
        take: params.perPage,
        order: { name: 'ASC' },
        select: ['phoneCodeId', 'code', 'name'],
      });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(phoneCodes, pageMetaDto);
  }
}
