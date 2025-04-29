import { AvailableType } from './../entities/availableType.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class AvailableTypeRepository extends Repository<AvailableType> {
  constructor(dataSource: DataSource) {
    super(AvailableType, dataSource.createEntityManager());
  }
}
