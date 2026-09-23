import { BackupModule } from './../backup/backup.module';
import { InvoiceModule } from './../invoices/invoice.module';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { CronJobService } from './services/cron.job.service';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { FactusModule } from '../factus/factus.module';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    InvoiceModule,
    BackupModule,
    // Para el reintento de las reversiones de inventario de notas crédito y de
    // ajuste. `FactusModule` ya exporta los dos servicios.
    FactusModule,
  ],
  controllers: [],
  providers: [CronJobService, UserRepository],
})
export class CronJobModule {}
