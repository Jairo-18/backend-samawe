import { Module } from '@nestjs/common';
import { LocalStorageService } from './services/local-storage.service';

@Module({
  providers: [LocalStorageService],
  exports: [LocalStorageService],
})
export class LocalStorageModule {}
