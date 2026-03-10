import { Module } from '@nestjs/common';
import { BackupController } from './controllers/backup.controller';
import { BackupService } from './services/backup.service';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from 'src/shared/shared.module';
import { GoogleDriveService } from './services/google-drive.service';
import { BackupUC } from './useCases/backup.uc';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
  ],
  controllers: [BackupController],
  providers: [BackupService, GoogleDriveService, BackupUC],
  exports: [BackupUC],
})
export class BackupModule {}
