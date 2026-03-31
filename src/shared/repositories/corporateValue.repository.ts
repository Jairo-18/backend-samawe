import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CorporateValue } from '../entities/corporateValue.entity';

@Injectable()
export class CorporateValueRepository extends Repository<CorporateValue> {
  constructor(dataSource: DataSource) {
    super(CorporateValue, dataSource.createEntityManager());
  }
}
