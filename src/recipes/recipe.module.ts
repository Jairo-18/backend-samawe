import { RecipeService } from './services/recipe.service';
import { RecipeController } from './controllers/recipe.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { RecipeRepository } from './../shared/repositories/recipe.repository';
import { IngredientRepository } from './../shared/repositories/ingredient.repository';
import { ProductRepository } from './../shared/repositories/product.repository';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [RecipeController],
  providers: [
    RecipeService,
    RecipeRepository,
    IngredientRepository,
    ProductRepository,
  ],
  exports: [RecipeService],
})
export class RecipeModule {}
