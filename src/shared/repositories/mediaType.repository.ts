import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MediaType } from '../entities/mediaType.entity';

@Injectable()
export class MediaTypeRepository extends Repository<MediaType> {
  constructor(dataSource: DataSource) {
    super(MediaType, dataSource.createEntityManager());
  }
}
