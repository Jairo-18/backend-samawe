import { PaidType } from './../entities/paidType.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PaidTypeRepository extends Repository<PaidType> {
  constructor(dataSource: DataSource) {
    super(PaidType, dataSource.createEntityManager());
  }
}
