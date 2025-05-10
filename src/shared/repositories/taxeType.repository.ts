import { TaxeType } from './../entities/taxeType.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class TaxeTypeRepository extends Repository<TaxeType> {
  constructor(dataSource: DataSource) {
    super(TaxeType, dataSource.createEntityManager());
  }
}
