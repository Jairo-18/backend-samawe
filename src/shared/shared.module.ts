import { StateType } from './entities/stateType.entity';
import { RoleTypeRepository } from './repositories/roleType.repository';
import { InvoiceDetaill } from './entities/invoiceDetaill.entity';
import { TaxeTypeRepository } from './repositories/taxeType.repository';
import { PhoneCodeRepository } from './repositories/phoneCode.repository';
import { PhoneCode } from './entities/phoneCode.entity';
import { AccessSessionsService } from './../auth/services/accessSessions.service';
import { AccessSessionsRepository } from './repositories/accessSessions.repository';
import { AccessSessions } from './entities/accessSessions.entity';
import { Invoice } from './entities/invoice.entity';
import { AdditionalType } from './entities/additionalType.entity';
import { PaidType } from './entities/paidType.entity';
import { PayType } from './entities/payType.entity';
import { TaxeType } from './entities/taxeType.entity';
import { ProductService } from './../products/services/product.service';
import { CategoryTypeRepository } from './repositories/categoryType.repository';
import { ProductRepository } from './repositories/product.repository';
import { CategoryType } from './entities/categoryType.entity';
import { Product } from './entities/product.entity';
import { UserService } from '../user/services/user.service';
import { AuthService } from '../auth/services/auth.service';
import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RoleType } from './entities/roleType.entity';
import { IdentificationType } from './entities/identificationType.entity';
import { IdentificationTypeRepository } from './repositories/identificationType.repository';
import { BedType } from './entities/bedType.entity';
import { Accommodation } from './entities/accommodation.entity';
import { Excursion } from './entities/excursion.entity';
import { Booking } from './entities/booking.entity';

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
          RoleType,
          IdentificationType,
          Product,
          CategoryType,
          TaxeType,
          PayType,
          PaidType,
          AdditionalType,
          Invoice,
          InvoiceDetaill,
          AccessSessions,
          PhoneCode,
          StateType,
          BedType,
          Accommodation,
          Excursion,
          Booking,
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
        RoleTypeRepository,
        IdentificationTypeRepository,
        ProductRepository,
        CategoryTypeRepository,
        TaxeTypeRepository,
        AccessSessionsRepository,
        PhoneCodeRepository,
        JwtStrategy,
        AuthService,
        UserService,
        ProductService,
        AccessSessionsService,
      ],
      exports: [
        TypeOrmModule,
        UserRepository,
        RoleTypeRepository,
        IdentificationTypeRepository,
        ProductRepository,
        CategoryTypeRepository,
        AccessSessionsRepository,
        PhoneCodeRepository,
        TaxeTypeRepository,
        AuthService,
        UserService,
        ProductService,
        AccessSessionsService,
      ],
    };
  }
}
