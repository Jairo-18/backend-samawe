import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Organizational } from '../entities/organizational.entity';

@Injectable()
export class OrganizationalRepository extends Repository<Organizational> {
  constructor(dataSource: DataSource) {
    super(Organizational, dataSource.createEntityManager());
  }
}
