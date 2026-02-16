import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Balance } from '../entities/balance.entity';

@Injectable()
export class BalanceRepository extends Repository<Balance> {
  constructor(dataSource: DataSource) {
    super(Balance, dataSource.createEntityManager());
  }
}
