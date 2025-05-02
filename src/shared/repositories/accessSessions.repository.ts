import { AccessSessions } from './../entities/accessSessions.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class AccessSessionsRepository extends Repository<AccessSessions> {
  constructor(dataSource: DataSource) {
    super(AccessSessions, dataSource.createEntityManager());
  }
}
