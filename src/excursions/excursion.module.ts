import { CrudExcursionUC } from './useCases/crudExcursionUC.uc';
import { ExcursionUC } from './useCases/excursionUC.uc';
import { CrudExcursionService } from './services/crudExcursion.service';
import { ExcursionService } from './services/excursion.service';
import { ExcursionController } from './controllers/excursion.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [ExcursionController],
  providers: [
    ExcursionService,
    CrudExcursionService,
    ExcursionUC,
    CrudExcursionUC,
  ],
})
export class ExcursionModule {}
