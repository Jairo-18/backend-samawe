import { InvoiceModule } from './../invoices/invoice.module';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { CronJobService } from './services/cron.job.service';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    InvoiceModule,
  ],
  controllers: [],
  providers: [CronJobService],
})
export class CronJobModule {}
