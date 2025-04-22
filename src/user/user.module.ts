import { UserRepository } from './../shared/repositories/user.repository';
import { Module } from '@nestjs/common';
import { UserController } from './controllers/user/user.controller';
import { UserService } from './services/user/user.service';
import { UserUC } from './useCases/user.uc';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from 'src/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/shared/entities/user.entity';
import { Role } from 'src/shared/entities/role.entity';
import { RoleRepository } from 'src/shared/repositories/role.repository';
import { identificationType } from 'src/shared/entities/identificationType.entity';
import { IdentificationTypeRepository } from 'src/shared/repositories/identificationType.repository';

@Module({
  controllers: [UserController],
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User, Role, identificationType]),
  ],
  providers: [
    UserService,
    UserRepository,
    UserUC,
    UserService,
    RoleRepository,
    IdentificationTypeRepository,
  ],
})
export class UserModule {}
