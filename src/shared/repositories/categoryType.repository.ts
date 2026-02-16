import { CategoryType } from './../entities/categoryType.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class CategoryTypeRepository extends Repository<CategoryType> {
  constructor(dataSource: DataSource) {
    super(CategoryType, dataSource.createEntityManager());
  }
}
