import { PayTypeRepository } from './../repositories/payType.repository';
import { PaidTypeRepository } from './../repositories/paidType.repository';
import { AdditionalRepository } from './../repositories/additionalType.repository';
import { StateTypeRepository } from './../repositories/stateType.repository';
import { BedTypeRepository } from './../repositories/bedType.repository';
import { RoleTypeRepository } from './../repositories/roleType.repository';
import { TaxeTypeRepository } from './../repositories/taxeType.repository';
import { CategoryTypeRepository } from './../repositories/categoryType.repository';
import { PhoneCodeRepository } from './../repositories/phoneCode.repository';
import { Injectable } from '@nestjs/common';
import { IdentificationTypeRepository } from '../repositories/identificationType.repository';
import { Repository } from 'typeorm';
import { InvoiceTypeRepository } from '../repositories/invoiceType.repository';

@Injectable()
export class RepositoryService {
  public repositories: {
    additionalType: AdditionalRepository;
    bedType: BedTypeRepository;
    categoryType: CategoryTypeRepository;
    identificationType: IdentificationTypeRepository;
    invoiceType: InvoiceTypeRepository;
    paidType: PaidTypeRepository;
    payType: PayTypeRepository;
    phoneCode: PhoneCodeRepository;
    roleType: RoleTypeRepository;
    stateType: StateTypeRepository;
    taxeType: TaxeTypeRepository;
  };

  constructor(
    private readonly _additionalRepository: AdditionalRepository,
    private readonly _bedTypeRepository: BedTypeRepository,
    private readonly _categoryTypeRepository: CategoryTypeRepository,
    private readonly _identificationTipeRepository: IdentificationTypeRepository,
    private readonly _invoiceTypeRepository: InvoiceTypeRepository,
    private readonly _paidTypeRepository: PaidTypeRepository,
    private readonly _payTypeRepository: PayTypeRepository,
    private readonly _phoneCodeRepository: PhoneCodeRepository,
    private readonly _roleRepository: RoleTypeRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _taxeTypeRepository: TaxeTypeRepository,
  ) {
    this.repositories = {
      additionalType: _additionalRepository,
      bedType: _bedTypeRepository,
      categoryType: _categoryTypeRepository,
      identificationType: _identificationTipeRepository,
      invoiceType: _invoiceTypeRepository,
      paidType: _paidTypeRepository,
      payType: _payTypeRepository,
      phoneCode: _phoneCodeRepository,
      roleType: _roleRepository,
      stateType: _stateTypeRepository,
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
