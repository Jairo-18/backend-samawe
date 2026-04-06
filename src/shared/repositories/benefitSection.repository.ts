import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BenefitSection } from '../entities/benefitSection.entity';

@Injectable()
export class BenefitSectionRepository extends Repository<BenefitSection> {
  constructor(dataSource: DataSource) {
    super(BenefitSection, dataSource.createEntityManager());
  }
}
