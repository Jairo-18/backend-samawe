import { BedType } from './../entities/bedType.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class BedTypeRepository extends Repository<BedType> {
  constructor(dataSource: DataSource) {
    super(BedType, dataSource.createEntityManager());
  }
}
