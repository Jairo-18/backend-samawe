import { Accommodation } from './../entities/accommodation.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class AccommodationRepository extends Repository<Accommodation> {
  constructor(dataSource: DataSource) {
    super(Accommodation, dataSource.createEntityManager());
  }
}
