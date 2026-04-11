import { InvoiceDetailService } from './../../invoices/services/invoiceDetail.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupUC } from '../../backup/useCases/backup.uc';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../shared/repositories/user.repository';
import { LessThan } from 'typeorm';

@Injectable()
export class CronJobService {
  private readonly logger = new Logger(CronJobService.name);

  constructor(
    private readonly _invoiceDetaillService: InvoiceDetailService,
    private readonly _backupUC: BackupUC,
    private readonly _configService: ConfigService,
    private readonly _userRepository: UserRepository,
  ) {}

  @Cron('*/10 * * * *')
  async handleExpiredUnverifiedUsers() {
    try {
      const deleted = await this._userRepository.delete({
        isEmailVerified: false,
        emailVerificationTokenExpiry: LessThan(new Date()),
      });
      if (deleted.affected > 0) {
        this.logger.log(
          `Eliminados ${deleted.affected} usuarios sin verificar con token expirado`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Error al limpiar usuarios no verificados',
        error.stack,
      );
    }
  }

  @Cron('0 */2 * * *')
  async handleReservationsJob() {
    await this._invoiceDetaillService.handleScheduledReservation();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBackup() {
    const appEnv = this._configService.get<string>('app.env');

    if (appEnv !== 'production') {
      return;
    }

    try {
      await this._backupUC.performBackupAndUpload();
    } catch (error) {
      this.logger.error(
        `Automated backup failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
