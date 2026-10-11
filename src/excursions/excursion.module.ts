import { ExcursionImageService } from './services/excursionImage.service';
import { CrudExcursionUC } from './useCases/crudExcursionUC.uc';
import { ExcursionUC } from './useCases/excursionUC.uc';
import { CrudExcursionService } from './services/crudExcursion.service';
import { ExcursionService } from './services/excursion.service';
import { ExcursionController } from './controllers/excursion.controller';
import { ExcursionPublicController } from './controllers/excursion-public.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  // El público primero: sus rutas `public/...` no deben caer en `:id`.
  controllers: [ExcursionPublicController, ExcursionController],
  providers: [
    ExcursionService,
    CrudExcursionService,
    ExcursionUC,
    CrudExcursionUC,
    ExcursionImageService,
  ],
})
export class ExcursionModule {}
