import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { OrganizationalController } from './controllers/organizational.controller';
import { OrganizationalService } from './services/organizational.service';
import { OrganizationalUC } from './useCases/organizational.uc';
import { LocalStorageModule } from '../local-storage/local-storage.module';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    LocalStorageModule,
  ],
  controllers: [OrganizationalController],
  providers: [OrganizationalUC, OrganizationalService],
  exports: [OrganizationalService],
})
export class OrganizationalModule {}
