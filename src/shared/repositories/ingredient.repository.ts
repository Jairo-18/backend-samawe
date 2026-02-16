import { Ingredient } from './../entities/ingredient.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class IngredientRepository extends Repository<Ingredient> {
  constructor(dataSource: DataSource) {
    super(Ingredient, dataSource.createEntityManager());
  }
}
