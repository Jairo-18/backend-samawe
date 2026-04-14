import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LegalItem } from '../entities/legalItem.entity';

@Injectable()
export class LegalItemRepository extends Repository<LegalItem> {
  constructor(dataSource: DataSource) {
    super(LegalItem, dataSource.createEntityManager());
  }
}
