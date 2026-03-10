import { InvoiceDetailService } from './../../invoices/services/invoiceDetail.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupUC } from '../../backup/useCases/backup.uc';

@Injectable()
export class CronJobService {
  private readonly logger = new Logger(CronJobService.name);

  constructor(
    private readonly _invoiceDetaillService: InvoiceDetailService,
    private readonly _backupUC: BackupUC,
  ) {}

  @Cron('0 */2 * * *')
  async handleReservationsJob() {
    await this._invoiceDetaillService.handleScheduledReservation();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBackup() {
    this.logger.log('Executing daily automated backup...');
    try {
      await this._backupUC.performBackupAndUpload();
    } catch (error) {
      this.logger.error(`Automated backup failed: ${error.message}`);
    }
  }
}
