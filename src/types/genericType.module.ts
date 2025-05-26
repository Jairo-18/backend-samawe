import { RepositoryService } from './../shared/services/repositoriry.service';
import { GenericTypeService } from './services/genericType.service';
import { GenericTypeUC } from './useCases/genericType.uc';
import { GenericTypeController } from './controllers/genericType.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [GenericTypeController],
  providers: [GenericTypeUC, GenericTypeService, RepositoryService],
})
export class GenericTypeModule {}
