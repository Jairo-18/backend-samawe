import { CloudinaryModule } from './../cloudinary/cloudinary.module';
import { CrudExcursionUC } from './useCases/crudExcursionUC.uc';
import { ExcursionUC } from './useCases/excursionUC.uc';
import { CrudExcursionService } from './services/crudExcursion.service';
import { ExcursionService } from './services/excursion.service';
import { ExcursionController } from './controllers/excursion.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { ExcursionImageService } from './services/excursionImage.service';
import { ExcursionImageController } from './controllers/excursionImage.controller';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CloudinaryModule,
  ],
  controllers: [ExcursionController, ExcursionImageController],
  providers: [
    ExcursionService,
    CrudExcursionService,
    ExcursionUC,
    CrudExcursionUC,
    ExcursionImageService,
  ],
})
export class ExcursionModule {}
