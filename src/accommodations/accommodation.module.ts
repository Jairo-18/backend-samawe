import { CrudAccommodationUC } from './useCases/crudAccommodationUC.uc';
import { CrudAccommodationService } from './services/crudAccommodation.service';
import { AccommodationService } from './services/accommodation.service';
import { AccommodationController } from './controllers/accommodation.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { AccommodationUC } from './useCases/accommodationUC.uc';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AccommodationController],
  providers: [
    AccommodationService,
    CrudAccommodationService,
    AccommodationUC,
    CrudAccommodationUC,
  ],
})
export class AccommodationModule {}
