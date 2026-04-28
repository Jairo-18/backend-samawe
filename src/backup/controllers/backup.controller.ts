import { Controller, Get, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BackupUC } from '../useCases/backup.uc';

@ApiBearerAuth()
@Controller('backup')
@ApiTags('Backup')
export class BackupController {
  constructor(private readonly _backupUC: BackupUC) {}

  @Get('generate')
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Generar y descargar un backup completo' })
  async generateBackup(@Res() res: Response) {
    try {
      const { archive, filename } = await this._backupUC.generateManualBackup();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      archive.on('error', (err) => {
        if (!res.headersSent) res.status(500).json({ message: err.message });
      });

      archive.pipe(res);
      await archive.finalize();
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ message: error.message });
      }
    }
  }

  @Get('test-upload')
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Probar subida manual a Google Drive' })
  async testUpload() {
    const fileId = await this._backupUC.performBackupAndUpload();
    return {
      statusCode: HttpStatus.OK,
      message: 'Backup manual subido exitosamente',
      data: { fileId },
    };
  }
}
