import { InvoiceDetailService } from './../../invoices/services/invoiceDetail.service';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CronJobService {
  constructor(private readonly _invoiceDetaillService: InvoiceDetailService) {}

  @Cron('0 */2 * * *')
  async handleReservationsJob() {
    await this._invoiceDetaillService.handleScheduledReservation();
  }
}
