import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { MenuController } from './controllers/menu.controller';
import { MenuService } from './services/menu.service';
import { MenuUC } from './useCases/menuUC.uc';

@Module({
  imports: [SharedModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [MenuController],
  providers: [MenuService, MenuUC],
  exports: [MenuService, MenuUC],
})
export class MenuModule {}
