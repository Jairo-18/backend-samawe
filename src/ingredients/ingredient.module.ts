import { IngredientService } from './services/ingredient.service';
import { IngredientController } from './controllers/ingredient.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { IngredientRepository } from './../shared/repositories/ingredient.repository';

@Module({
  imports: [SharedModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [IngredientController],
  providers: [IngredientService, IngredientRepository],
  exports: [IngredientService],
})
export class IngredientModule {}
