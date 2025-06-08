import { InvoiceDetaillRepository } from './repositories/invoiceDetaill.repository';
import { InvoiceRepository } from './repositories/invoice.repository';
import { PayTypeRepository } from './repositories/payType.repository';
import { PaidTypeRepository } from './repositories/paidType.repository';
import { AdditionalRepository } from './repositories/additionalType.repository';
import { ExcursionRepository } from './repositories/excursion.repository';
import { StateTypeRepository } from './repositories/stateType.repository';
import { BookingRepository } from './repositories/booking.repository';
import { BedTypeRepository } from './repositories/bedType.repository';
import { AccommodationRepository } from './repositories/accommodation.repository';
import { RepositoryService } from './services/repositoriry.service';
import { StateType } from './entities/stateType.entity';
import { RoleTypeRepository } from './repositories/roleType.repository';
import { TaxeTypeRepository } from './repositories/taxeType.repository';
import { PhoneCodeRepository } from './repositories/phoneCode.repository';
import { PhoneCode } from './entities/phoneCode.entity';
import { AccessSessionsRepository } from './repositories/accessSessions.repository';
import { AccessSessions } from './entities/accessSessions.entity';
import { Invoice } from './entities/invoice.entity';
import { AdditionalType } from './entities/additionalType.entity';
import { PaidType } from './entities/paidType.entity';
import { PayType } from './entities/payType.entity';
import { TaxeType } from './entities/taxeType.entity';
import { CategoryTypeRepository } from './repositories/categoryType.repository';
import { ProductRepository } from './repositories/product.repository';
import { CategoryType } from './entities/categoryType.entity';
import { Product } from './entities/product.entity';
import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { RoleType } from './entities/roleType.entity';
import { IdentificationType } from './entities/identificationType.entity';
import { IdentificationTypeRepository } from './repositories/identificationType.repository';
import { BedType } from './entities/bedType.entity';
import { Accommodation } from './entities/accommodation.entity';
import { Excursion } from './entities/excursion.entity';
import { Booking } from './entities/booking.entity';
import { InvoiceType } from './entities/invoiceType.entity';
import { InvoiceTypeRepository } from './repositories/invoiceType.repository';
import { InvoiceDetaill } from './entities/invoiceDetaill.entity';

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
            extra: {
              max: 10,
              keepAlive: true,
            },
          }),
        }),

        PassportModule,
        TypeOrmModule.forFeature([
          AccessSessions,
          Accommodation,
          AdditionalType,
          BedType,
          Booking,
          CategoryType,
          Excursion,
          IdentificationType,
          Invoice,
          InvoiceDetaill,
          InvoiceType,
          PaidType,
          PayType,
          PhoneCode,
          Product,
          RoleType,
          TaxeType,
          StateType,
          User,
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
      controllers: [],
      providers: [
        AccessSessionsRepository,
        AccommodationRepository,
        AdditionalRepository,
        BedTypeRepository,
        BookingRepository,
        CategoryTypeRepository,
        ExcursionRepository,
        IdentificationTypeRepository,
        InvoiceRepository,
        InvoiceDetaillRepository,
        InvoiceTypeRepository,
        PaidTypeRepository,
        PayTypeRepository,
        PhoneCodeRepository,
        ProductRepository,
        RoleTypeRepository,
        StateTypeRepository,
        TaxeTypeRepository,
        UserRepository,
        RepositoryService,
      ],
      exports: [
        TypeOrmModule,
        AccessSessionsRepository,
        AccommodationRepository,
        AdditionalRepository,
        BedTypeRepository,
        BookingRepository,
        CategoryTypeRepository,
        ExcursionRepository,
        IdentificationTypeRepository,
        InvoiceRepository,
        InvoiceDetaillRepository,
        InvoiceTypeRepository,
        PaidTypeRepository,
        PayTypeRepository,
        PhoneCodeRepository,
        ProductRepository,
        RoleTypeRepository,
        StateTypeRepository,
        TaxeTypeRepository,
        UserRepository,
        RepositoryService,
      ],
    };
  }
}
