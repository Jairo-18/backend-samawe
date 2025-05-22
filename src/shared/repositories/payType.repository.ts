import { PayType } from './../entities/payType.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PayTypeRepository extends Repository<PayType> {
  constructor(dataSource: DataSource) {
    super(PayType, dataSource.createEntityManager());
  }
}
