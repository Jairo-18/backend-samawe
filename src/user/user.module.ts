import { CrudUserUC } from './useCases/crudUserUC';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { UserController } from './controllers/user.controller';
import { CrudUserService } from './services/crudUser.service';
import { UserUC } from './useCases/userUC.uc';

@Module({
  imports: [SharedModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [UserController],
  providers: [
    UserUC,
    CrudUserUC,
    CrudUserService,
  ],
})
export class UserModule {}
