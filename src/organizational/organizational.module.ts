import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { OrganizationalController } from './controllers/organizational.controller';
import { GoogleBusinessController } from './controllers/google-business.controller';
import { OrganizationalService } from './services/organizational.service';
import { OrganizationalUC } from './useCases/organizational.uc';
import { GoogleBusinessService } from './services/google-business.service';

@Module({
  imports: [
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [OrganizationalController, GoogleBusinessController],
  providers: [OrganizationalUC, OrganizationalService, GoogleBusinessService],
  exports: [OrganizationalService, GoogleBusinessService],
})
export class OrganizationalModule {}
