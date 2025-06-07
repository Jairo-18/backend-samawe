import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { EarningController } from './controllers/earning.controller';
import { EarningService } from './services/earning.service';
import { EarningUC } from './useCases/earningUC.uc';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [EarningController],
  providers: [EarningUC, EarningService],
})
export class EarningModule {}
