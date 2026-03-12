import { InvoiceDetailService } from './../../invoices/services/invoiceDetail.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupUC } from '../../backup/useCases/backup.uc';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CronJobService {
  private readonly logger = new Logger(CronJobService.name);

  constructor(
    private readonly _invoiceDetaillService: InvoiceDetailService,
    private readonly _backupUC: BackupUC,
    private readonly _configService: ConfigService,
  ) {}

  @Cron('0 */2 * * *')
  async handleReservationsJob() {
    await this._invoiceDetaillService.handleScheduledReservation();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBackup() {
    const appEnv = this._configService.get<string>('app.env');

    if (appEnv !== 'production') {
      this.logger.log(
        `Skipping daily automated backup (Environment: ${appEnv})`,
      );
      return;
    }

    this.logger.log('Executing daily automated backup...');
    try {
      await this._backupUC.performBackupAndUpload();
    } catch (error) {
      this.logger.error(`Automated backup failed: ${error.message}`);
    }
  }
}
