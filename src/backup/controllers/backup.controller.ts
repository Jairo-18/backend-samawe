import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { BackupService } from '../services/backup.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Backup')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  @UseGuards(AuthGuard())
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Exporta toda la base de datos en SQL y las imágenes en un archivo ZIP',
  })
  async exportBackup(@Res() res: Response) {
    try {
      await this.backupService.generateBackup(res);
    } catch (error) {
      console.error('Error generating backup:', error);
      res.status(500).json({ message: 'Error generating backup zip' });
    }
  }
}
