import { Module } from '@nestjs/common';
import { BackupController } from './controllers/backup.controller';
import { BackupService } from './services/backup.service';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
