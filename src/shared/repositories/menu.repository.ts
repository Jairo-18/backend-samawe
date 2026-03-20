import { Menu } from './../entities/menu.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class MenuRepository extends Repository<Menu> {
  constructor(dataSource: DataSource) {
    super(Menu, dataSource.createEntityManager());
  }
}
