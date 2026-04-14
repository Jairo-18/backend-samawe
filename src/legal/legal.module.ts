import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { LegalController } from './controllers/legal.controller';
import { LegalService } from './services/legal.service';
import { LegalUC } from './useCases/legal.uc';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [LegalController],
  providers: [LegalUC, LegalService],
  exports: [LegalService],
})
export class LegalModule {}
