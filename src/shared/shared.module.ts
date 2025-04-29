import { ProductService } from './../products/services/product.service';
import { CategoryTypeRepository } from './repositories/categoryType.repository';
import { ProductRepository } from './repositories/product.repository';
import { AvailableTypeRepository } from './repositories/available.repository';
import { AvailableType } from './entities/availableType.entity';
import { CategoryType } from './entities/categoryType.entity';
import { Product } from './entities/product.entity';
import { UserService } from './../user/services/user/user.service';
import { AuthService } from './../auth/services/auth/auth.service';
import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Role } from './entities/role.entity';
import { IdentificationType } from './entities/identificationType.entity';
import { RoleRepository } from './repositories/role.repository';
import { IdentificationTypeRepository } from './repositories/identificationType.repository';

@Module({})
export class SharedModule {
  static forRoot(): DynamicModule {
    return {
      module: SharedModule,
      imports: [
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('db.host'),
            port: configService.get<number>('db.port'),
            username: configService.get('db.user'),
            password: configService.get('db.password'),
            database: configService.get('db.database'),
            entities: [__dirname + '/src/**/*.entity{.ts,.js}'],
            autoLoadEntities: true,
            ssl: {
              rejectUnauthorized: false,
            },
          }),
        }),
        PassportModule,
        TypeOrmModule.forFeature([
          User,
          Role,
          IdentificationType,
          Product,
          CategoryType,
          AvailableType,
        ]),
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('jwt.secret'),
            signOptions: { expiresIn: configService.get('jwt.expiresIn') },
          }),
        }),
        PassportModule.register({
          defaultStrategy: 'jwt',
        }),
      ],
      providers: [
        UserRepository,
        RoleRepository,
        IdentificationTypeRepository,
        ProductRepository,
        CategoryTypeRepository,
        AvailableTypeRepository,
        JwtStrategy,
        AuthService,
        UserService,
        ProductService,
      ],
      exports: [
        TypeOrmModule,
        UserRepository,
        RoleRepository,
        IdentificationTypeRepository,
        ProductRepository,
        CategoryTypeRepository,
        AvailableTypeRepository,
        AuthService,
        UserService,
        ProductService,
      ],
    };
  }
}
