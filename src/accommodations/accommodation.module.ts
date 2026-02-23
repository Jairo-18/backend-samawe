import { AccommodationImageService } from './services/accommodationImage.service';
import { CrudAccommodationUC } from './useCases/crudAccommodationUC.uc';
import { CrudAccommodationService } from './services/crudAccommodation.service';
import { AccommodationService } from './services/accommodation.service';
import { AccommodationController } from './controllers/accommodation.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { AccommodationUC } from './useCases/accommodationUC.uc';
import { LocalStorageModule } from '../local-storage/local-storage.module';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    LocalStorageModule,
  ],
  controllers: [AccommodationController],
  providers: [
    AccommodationService,
    CrudAccommodationService,
    AccommodationUC,
    CrudAccommodationUC,
    AccommodationImageService,
  ],
})
export class AccommodationModule {}
