import { Controller, Get, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BackupUC } from '../useCases/backup.uc';

@Controller('backup')
@ApiTags('Backup')
export class BackupController {
  constructor(private readonly _backupUC: BackupUC) {}

  @Get('generate')
  @UseGuards(AuthGuard())
  @ApiOperation({ summary: 'Generar y descargar un backup completo' })
  async generateBackup(@Res() res: Response) {
    const { archive, filename } = await this._backupUC.generateManualBackup();

    res.attachment(filename);
    archive.pipe(res);
    await archive.finalize();
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
