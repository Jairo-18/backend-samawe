import { PersonType } from './../entities/personType.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PersonTypeRepository extends Repository<PersonType> {
  constructor(dataSource: DataSource) {
    super(PersonType, dataSource.createEntityManager());
  }
}
