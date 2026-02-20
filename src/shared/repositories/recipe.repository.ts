import { Recipe } from './../entities/recipe.entity';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class RecipeRepository extends Repository<Recipe> {
  constructor(dataSource: DataSource) {
    super(Recipe, dataSource.createEntityManager());
  }
}
