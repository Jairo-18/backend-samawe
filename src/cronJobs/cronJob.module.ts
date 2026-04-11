import { BackupModule } from './../backup/backup.module';
import { InvoiceModule } from './../invoices/invoice.module';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { CronJobService } from './services/cron.job.service';
import { UserRepository } from 'src/shared/repositories/user.repository';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    InvoiceModule,
    BackupModule,
  ],
  controllers: [],
  providers: [CronJobService, UserRepository],
})
export class CronJobModule {}
