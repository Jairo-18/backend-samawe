import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LegalItemChild } from '../entities/legalItemChild.entity';

@Injectable()
export class LegalItemChildRepository extends Repository<LegalItemChild> {
  constructor(dataSource: DataSource) {
    super(LegalItemChild, dataSource.createEntityManager());
  }
}
