import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RepositoryService } from './shared/services/repositoriry.service';
import * as os from 'os';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly _repositoryService: RepositoryService,
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

    const port = this.configService.get<number>('app.port') || 3001;

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
    ]);

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
    };
  }
}
