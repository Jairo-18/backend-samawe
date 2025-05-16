import { StateType } from './../entities/stateType.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class StateTypeRepository extends Repository<StateType> {
  constructor(dataSource: DataSource) {
    super(StateType, dataSource.createEntityManager());
  }
}
