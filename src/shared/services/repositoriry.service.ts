import { StateTypeRepository } from './../repositories/stateType.repository';
import { BedTypeRepository } from './../repositories/bedType.repository';
import { RoleTypeRepository } from './../repositories/roleType.repository';
import { TaxeTypeRepository } from './../repositories/taxeType.repository';
import { CategoryTypeRepository } from './../repositories/categoryType.repository';
import { PhoneCodeRepository } from './../repositories/phoneCode.repository';
import { Injectable } from '@nestjs/common';
import { IdentificationTypeRepository } from '../repositories/identificationType.repository';
import { Repository } from 'typeorm';

@Injectable()
export class RepositoryService {
  public repositories: {
    roleType: RoleTypeRepository;
    identificationType: IdentificationTypeRepository;
    phoneCode: PhoneCodeRepository;
    categoryType: CategoryTypeRepository;
    taxeType: TaxeTypeRepository;
    bedType: BedTypeRepository;
    stateType: StateTypeRepository;
  };

  constructor(
    private readonly _roleRepository: RoleTypeRepository,
    private readonly _identificationTipeRepository: IdentificationTypeRepository,
    private readonly _phoneCodeRepository: PhoneCodeRepository,
    private readonly _categoryTypeRepository: CategoryTypeRepository,
    private readonly _taxeTypeRepository: TaxeTypeRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _bedTypeRepository: BedTypeRepository,
  ) {
    this.repositories = {
      roleType: _roleRepository,
      identificationType: _identificationTipeRepository,
      phoneCode: _phoneCodeRepository,
      categoryType: _categoryTypeRepository,
      taxeType: _taxeTypeRepository,
      bedType: _bedTypeRepository,
      stateType: _stateTypeRepository,
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
