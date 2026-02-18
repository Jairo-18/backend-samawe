import { UnitOfMeasure } from '../entities/unitOfMeasure.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class UnitOfMeasureRepository extends Repository<UnitOfMeasure> {
  constructor(dataSource: DataSource) {
    super(UnitOfMeasure, dataSource.createEntityManager());
  }
}
