import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { identificationType } from '../entities/identificationType.entity';

@Injectable()
export class IdentificationTypeRepository extends Repository<identificationType> {
  constructor(dataSource: DataSource) {
    super(identificationType, dataSource.createEntityManager());
  }
}
