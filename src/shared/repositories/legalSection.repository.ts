import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LegalSection } from '../entities/legalSection.entity';

@Injectable()
export class LegalSectionRepository extends Repository<LegalSection> {
  constructor(dataSource: DataSource) {
    super(LegalSection, dataSource.createEntityManager());
  }
}
