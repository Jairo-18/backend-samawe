import { InventoryService } from './services/inventory.service';
import { StatisticsService } from './services/statistics.service';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { EarningController } from './controllers/earning.controller';
import { EarningService } from './services/earning.service';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [EarningController],
  providers: [StatisticsService, EarningService, InventoryService],
})
export class EarningModule {}
