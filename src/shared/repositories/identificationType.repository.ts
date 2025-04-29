import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { IdentificationType } from '../entities/identificationType.entity';

@Injectable()
export class IdentificationTypeRepository extends Repository<IdentificationType> {
  constructor(dataSource: DataSource) {
    super(IdentificationType, dataSource.createEntityManager());
  }
}
