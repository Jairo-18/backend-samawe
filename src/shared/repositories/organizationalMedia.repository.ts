import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrganizationalMedia } from '../entities/organizationalMedia.entity';

@Injectable()
export class OrganizationalMediaRepository extends Repository<OrganizationalMedia> {
  constructor(dataSource: DataSource) {
    super(OrganizationalMedia, dataSource.createEntityManager());
  }
}
