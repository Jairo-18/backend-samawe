import { CrudUserUC } from './useCases/crudUserUC';
import { UserService } from './services/user.service';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from './../shared/shared.module';
import { UserController } from './controllers/user.controller';
import { CrudUserService } from './services/crudUser.service';
import { UserUC } from './useCases/userUC.uc';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [UserController],
  providers: [UserUC, CrudUserUC, CrudUserService, UserService],
  exports: [UserService],
})
export class UserModule {}
