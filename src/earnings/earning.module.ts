import { ReportUC } from './useCases/reportUC.uc';
import { EarningUC } from './useCases/earningUC.uc';
import { ReportController } from './controllers/report.controller';
import { ReportService } from './services/report.service';
import { InventoryService } from './services/inventory.service';
import { StatisticsService } from './services/statistics.service';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { EarningController } from './controllers/earning.controller';
import { EarningService } from './services/earning.service';

@Module({
  imports: [SharedModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [EarningController, ReportController],
  providers: [
    StatisticsService,
    EarningService,
    InventoryService,
    ReportService,
    EarningUC,
    ReportUC,
  ],
  exports: [
    StatisticsService,
    EarningService,
    InventoryService,
    ReportService,
    EarningUC,
    ReportUC,
  ],
})
export class EarningModule {}
