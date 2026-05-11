import { AccommodationImageService } from './services/accommodationImage.service';
import { CrudAccommodationUC } from './useCases/crudAccommodationUC.uc';
import { CrudAccommodationService } from './services/crudAccommodation.service';
import { AccommodationService } from './services/accommodation.service';
import { AccommodationController } from './controllers/accommodation.controller';
import { AccommodationPublicController } from './controllers/accommodation-public.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { AccommodationUC } from './useCases/accommodationUC.uc';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AccommodationController, AccommodationPublicController],
  providers: [
    AccommodationService,
    CrudAccommodationService,
    AccommodationUC,
    CrudAccommodationUC,
    AccommodationImageService,
  ],
})
export class AccommodationModule {}
