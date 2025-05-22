import { AdditionalType } from './../entities/additionalType.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class AdditionalRepository extends Repository<AdditionalType> {
  constructor(dataSource: DataSource) {
    super(AdditionalType, dataSource.createEntityManager());
  }
}
