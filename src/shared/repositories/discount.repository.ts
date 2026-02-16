import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DiscountType } from '../entities/discountType.entity';

@Injectable()
export class DiscountTypeRepository extends Repository<DiscountType> {
  constructor(dataSource: DataSource) {
    super(DiscountType, dataSource.createEntityManager());
  }
}
