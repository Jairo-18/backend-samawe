import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RepositoryService } from './shared/services/repositoriry.service';
import { OrganizationalService } from './organizational/services/organizational.service';
import * as os from 'os';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly _repositoryService: RepositoryService,
    private readonly _organizationalService: OrganizationalService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  getServerInfo() {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }

    const port = this.configService.get<number>('app.port') || 3000;

    return {
      port,
      addresses,
      primaryAddress: addresses[0] || 'localhost',
      apiUrl: `http://${addresses[0] || 'localhost'}:${port}/`,
      message: 'Usa cualquiera de las direcciones para conectar las tablets',
    };
  }

  async getRelatedData() {
    const [
      identificationType,
      phoneCode,
      roleType,
      categoryType,
      stateType,
      bedType,
      unitOfMeasure,
      invoiceType,
      taxeType,
      payType,
      paidType,
      discountType,
      additionalType,
      personType,
      organizational,
    ] = await Promise.all([
      this._repositoryService.repositories.identificationType.find({
        select: ['identificationTypeId', 'name', 'code'],
      }),
      this._repositoryService.repositories.phoneCode.find({
        select: ['phoneCodeId', 'name', 'code'],
      }),
      this._repositoryService.repositories.roleType.find({
        select: ['roleTypeId', 'name', 'code'],
      }),
      this._repositoryService.repositories.categoryType.find({
        select: ['categoryTypeId', 'name', 'code'],
      }),
      this._repositoryService.repositories.stateType.find({
        select: ['stateTypeId', 'name', 'code'],
      }),
      this._repositoryService.repositories.bedType.find({
        select: ['bedTypeId', 'name', 'code'],
      }),
      this._repositoryService.repositories.unitOfMeasure.find({
        select: ['unitOfMeasureId', 'name', 'code'],
      }),
      this._repositoryService.repositories.invoiceType.find({
        select: ['invoiceTypeId', 'name', 'code'],
      }),
      this._repositoryService.repositories.taxeType.find({
        select: ['taxeTypeId', 'name', 'percentage'],
      }),
      this._repositoryService.repositories.payType.find({
        select: ['payTypeId', 'name', 'code'],
      }),
      this._repositoryService.repositories.paidType.find({
        select: ['paidTypeId', 'name', 'code'],
      }),
      this._repositoryService.repositories.discountType.find({
        select: ['discountTypeId', 'name', 'code', 'percent'],
      }),
      this._repositoryService.repositories.additionalType.find({
        select: ['additionalTypeId', 'code', 'value'],
      }),
      this._repositoryService.repositories.personType.find({
        select: ['personTypeId', 'name', 'code'],
      }),
      this._organizationalService.findAllWithFullData(),
    ]);

    const mappedOrganizational = organizational.map((org) => {
      const rest = { ...org };
      delete (rest as any).createdAt;
      delete (rest as any).updatedAt;
      delete (rest as any).deletedAt;

      const cleanRel = (rel: any) => {
        if (!rel) return rel;
        const clean = { ...rel };
        delete clean.createdAt;
        delete clean.updatedAt;
        delete clean.deletedAt;
        return clean;
      };

      return {
        ...rest,
        identificationType: cleanRel(org.identificationType),
        phoneCode: cleanRel(org.phoneCode),
        personType: cleanRel(org.personType),
        medias:
          org.medias?.map((m) => ({
            ...cleanRel(m),
            mediaType: cleanRel(m.mediaType),
          })) || [],
        benefitSections:
          org.benefitSections?.map((section) => ({
            ...cleanRel(section),
            items: section.items?.map((item) => cleanRel(item)) || [],
          })) || [],
      };
    });

    return {
      identificationType,
      phoneCode,
      roleType,
      categoryType,
      stateType,
      bedType,
      unitOfMeasure,
      invoiceType,
      taxeType,
      payType,
      paidType,
      discountType,
      additionalType,
      personType,
      organizational: mappedOrganizational,
    };
  }
}
