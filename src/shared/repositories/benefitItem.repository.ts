import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BenefitItem } from '../entities/benefitItem.entity';

@Injectable()
export class BenefitItemRepository extends Repository<BenefitItem> {
  constructor(dataSource: DataSource) {
    super(BenefitItem, dataSource.createEntityManager());
  }
}
