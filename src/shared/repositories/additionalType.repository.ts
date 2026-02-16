import { AdditionalType } from './../entities/additionalType.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class AdditionalTypeRepository extends Repository<AdditionalType> {
  constructor(dataSource: DataSource) {
    super(AdditionalType, dataSource.createEntityManager());
  }
}
