import { TaxeTypeRepository } from './../repositories/taxeType.repository';
import { CategoryTypeRepository } from './../repositories/categoryType.repository';
import { PhoneCodeRepository } from './../repositories/phoneCode.repository';
import { Injectable } from '@nestjs/common';
import { IdentificationTypeRepository } from '../repositories/identificationType.repository';
import { RoleRepository } from '../repositories/role.repository';
import { Repository } from 'typeorm';

@Injectable()
export class RepositoryService {
  public repositories: {
    roleType: RoleRepository;
    identificationType: IdentificationTypeRepository;
    phoneCode: PhoneCodeRepository;
    categoryType: CategoryTypeRepository;
    taxeType: TaxeTypeRepository;
  };

  constructor(
    private readonly _roleRepository: RoleRepository,
    private readonly _identificationTipeRepository: IdentificationTypeRepository,
    private readonly _phoneCodeRepository: PhoneCodeRepository,
    private readonly _categoryTypeRepository: CategoryTypeRepository,
    private readonly _taxeTypeRepository: TaxeTypeRepository,
  ) {
    this.repositories = {
      roleType: _roleRepository,
      identificationType: _identificationTipeRepository,
      phoneCode: _phoneCodeRepository,
      categoryType: _categoryTypeRepository,
      taxeType: _taxeTypeRepository,
    };
  }

  /**
   * Método para obtener todas las entidades del repositorio enviado por los parametros
   * @param repository
   * @returns
   */
  async getEntities<T>(repository: Repository<T>): Promise<T[]> {
    return await repository.find();
  }
}
