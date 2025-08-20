import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AccommodationImage } from '../entities/accommodationImage.entity';

@Injectable()
export class AccommodationImageRepository extends Repository<AccommodationImage> {
  constructor(dataSource: DataSource) {
    super(AccommodationImage, dataSource.createEntityManager());
  }
}
