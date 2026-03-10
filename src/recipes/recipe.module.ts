import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { RecipeController } from './controllers/recipe.controller';
import { RecipeService } from './services/recipe.service';
import { RecipeUC } from './useCases/recipeUC.uc';

@Module({
  imports: [SharedModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [RecipeController],
  providers: [RecipeService, RecipeUC],
  exports: [RecipeService, RecipeUC],
})
export class RecipeModule {}
