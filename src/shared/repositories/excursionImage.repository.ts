import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExcursionImage } from '../entities/escursionImage.entity';

@Injectable()
export class ExcursionImageRepository extends Repository<ExcursionImage> {
  constructor(dataSource: DataSource) {
    super(ExcursionImage, dataSource.createEntityManager());
  }
}
