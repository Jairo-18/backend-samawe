import { RepositoryService } from 'src/shared/services/repositoriry.service';
import { CrudUserService } from './services/user/crudUser.service';
import { IdentificationTypeRepository } from './../shared/repositories/identificationType.repository';
import { RoleRepository } from './../shared/repositories/role.repository';
import { identificationType } from './../shared/entities/identificationType.entity';
import { Role } from './../shared/entities/role.entity';
import { User } from './../shared/entities/user.entity';
import { SharedModule } from './../shared/shared.module';
import { CrudUserUseCase } from './useCases/crudUser.UC';
import { UserRepository } from './../shared/repositories/user.repository';
import { Module } from '@nestjs/common';
import { UserController } from './controllers/user/user.controller';
import { UserService } from './services/user/user.service';
import { UserUC } from './useCases/user.uc';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [UserController],
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User, Role, identificationType]),
  ],
  providers: [
    UserService,
    CrudUserService,
    UserRepository,
    CrudUserUseCase,
    UserUC,
    UserService,
    RoleRepository,
    IdentificationTypeRepository,
    RepositoryService,
  ],
})
export class UserModule {}
