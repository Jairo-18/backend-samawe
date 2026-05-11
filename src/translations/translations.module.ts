import { Module } from '@nestjs/common';
import { TranslationsController } from './translations.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [TranslationsController],
})
export class TranslationsModule {}
