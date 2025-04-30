import { RepositoryService } from './../shared/services/repositoriry.service';
import { CrudUserService } from './services/crudUser.service';
import { IdentificationTypeRepository } from './../shared/repositories/identificationType.repository';
import { RoleRepository } from './../shared/repositories/role.repository';
import { IdentificationType } from './../shared/entities/identificationType.entity';
import { RoleType } from '../shared/entities/roleType.entity';
import { User } from './../shared/entities/user.entity';
import { SharedModule } from './../shared/shared.module';
import { CrudUserUseCase } from './useCases/crudUser.UC';
import { UserRepository } from './../shared/repositories/user.repository';
import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserUC } from './useCases/user.uc';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [UserController],
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User, RoleType, IdentificationType]),
  ],
  providers: [
    CrudUserUseCase,
    UserUC,
    UserService,
    CrudUserService,
    UserService,
    UserRepository,
    RoleRepository,
    IdentificationTypeRepository,
    RepositoryService,
  ],
})
export class UserModule {}
