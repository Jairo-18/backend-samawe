import { InvoiceDetailService } from './../../invoices/services/invoiceDetail.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupUC } from '../../backup/useCases/backup.uc';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../shared/repositories/user.repository';
import { FactusCreditNoteService } from '../../factus/services/factus-credit-note.service';
import { FactusAdjustmentNoteService } from '../../factus/services/factus-adjustment-note.service';

@Injectable()
export class CronJobService {
  private readonly logger = new Logger(CronJobService.name);
  private readonly KEEP_LAST_BACKUPS = 7;

  constructor(
    private readonly _invoiceDetaillService: InvoiceDetailService,
    private readonly _backupUC: BackupUC,
    private readonly _configService: ConfigService,
    private readonly _userRepository: UserRepository,
    private readonly _factusCreditNoteService: FactusCreditNoteService,
    private readonly _factusAdjustmentNoteService: FactusAdjustmentNoteService,
  ) {}

  @Cron('*/10 * * * *')
  async handleExpiredUnverifiedUsers() {
    try {
      const expiredUsers = await this._userRepository
        .createQueryBuilder('user')
        .leftJoin('user.invoices', 'invoice')
        .where('user.isEmailVerified = :verified', { verified: false })
        .andWhere('user.emailVerificationTokenExpiry < :now', {
          now: new Date(),
        })
        .andWhere('invoice.invoiceId IS NULL')
        .select('user.userId')
        .getMany();

      if (expiredUsers.length === 0) return;

      const ids = expiredUsers.map((u) => u.userId);
      const deleted = await this._userRepository.delete(ids);

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

  /**
   * Reintenta las reversiones de inventario de notas crédito y de ajuste que
   * quedaron a medias.
   *
   * Por qué existe: la nota ya es válida ante la DIAN antes de tocar el
   * inventario, así que si el movimiento de stock falla no se puede deshacer la
   * emisión — lo único sensato es reintentarlo. Antes solo quedaba una línea de
   * log y la mercancía nunca volvía al inventario.
   *
   * Cada 15 min y no más seguido porque lo normal es que no haya NADA que
   * hacer: ambas consultas van contra un índice parcial sobre las pendientes.
   */
  @Cron('*/15 * * * *')
  async handlePendingInventoryReversals() {
    try {
      const credito =
        await this._factusCreditNoteService.retryPendingInventoryReversals();
      const ajuste =
        await this._factusAdjustmentNoteService.retryPendingInventoryReversals();

      const pendientes = credito.pending + ajuste.pending;
      if (pendientes === 0) return;

      const recuperadas = credito.recovered + ajuste.recovered;
      this.logger.warn(
        `Reintento de inventario: ${recuperadas}/${pendientes} nota(s) ` +
          'resueltas. Las que sigan pendientes se reintentan en la próxima pasada.',
      );
    } catch (error) {
      this.logger.error(
        `Error reintentando las reversiones de inventario: ${error.message}`,
        error.stack,
      );
    }
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
      return;
    }

    try {
      const deleted = await this._backupUC.cleanupOldBackups(
        this.KEEP_LAST_BACKUPS,
      );
      this.logger.log(
        `Limpieza de backups: ${deleted} archivo(s) eliminado(s), se conservan los últimos ${this.KEEP_LAST_BACKUPS}`,
      );
    } catch (error) {
      this.logger.error(
        `Limpieza de backups fallida: ${error.message}`,
        error.stack,
      );
    }
  }
}
