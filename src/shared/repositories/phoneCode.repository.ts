import { PhoneCode } from './../entities/phoneCode.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PhoneCodeRepository extends Repository<PhoneCode> {
  constructor(dataSource: DataSource) {
    super(PhoneCode, dataSource.createEntityManager());
  }
}
