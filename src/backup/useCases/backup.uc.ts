import { Injectable, Logger } from '@nestjs/common';
import { BackupService } from '../services/backup.service';

@Injectable()
export class BackupUC {
  private readonly logger = new Logger(BackupUC.name);

  constructor(private readonly backupService: BackupService) {}

  async performBackupAndUpload(): Promise<string> {
    try {
      const fileId = await this.backupService.executeFullBackupAndUpload();
      this.logger.log(`Backup uploaded successfully. File ID: ${fileId}`);
      return fileId;
    } catch (error) {
      this.logger.error(`Backup process failed: ${error.message}`);
      throw error;
    }
  }

  async generateManualBackup() {
    return this.backupService.createBackupStream();
  }
}
