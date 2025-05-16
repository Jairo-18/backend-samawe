import { Excursion } from './../entities/excursion.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ExcursionRepository extends Repository<Excursion> {
  constructor(dataSource: DataSource) {
    super(Excursion, dataSource.createEntityManager());
  }
}
