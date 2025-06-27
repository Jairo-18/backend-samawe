import { NotificationService } from './../notifications/services/notification.service';
import { UserService } from './../user/services/user.service';
import { NotificationRepository } from './repositories/notification.repository';
import { CronService } from './services/cron.service';
import { PasswordService } from './../user/services/password.service';
import { InvoiceEventsListener } from './services/invoiceEventsListener.service';
import { BalanceService } from './services/balance.service';
import { InvoiceDetaillRepository } from './repositories/invoiceDetaill.repository';
import { InvoiceRepository } from './repositories/invoice.repository';
import { PayTypeRepository } from './repositories/payType.repository';
import { PaidTypeRepository } from './repositories/paidType.repository';
import { AdditionalRepository } from './repositories/additionalType.repository';
import { ExcursionRepository } from './repositories/excursion.repository';
import { StateTypeRepository } from './repositories/stateType.repository';
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
import { InvoiceType } from './entities/invoiceType.entity';
import { InvoiceTypeRepository } from './repositories/invoiceType.repository';
import { InvoiceDetaill } from './entities/invoiceDetaill.entity';
import { BalanceRepository } from './repositories/balance.repository';
import { Balance } from './entities/balance.entity';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MailsService } from './services/mails.service';
import { MailTemplateService } from './services/mail-template.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { GeneralInvoiceDetaillService } from './services/generalInvoiceDetaill.service';

import { Notification } from './entities/notification.entity';
import { ScheduleModule } from '@nestjs/schedule';

@Module({})
export class SharedModule {
  static forRoot(): DynamicModule {
    return {
      module: SharedModule,
      imports: [
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot(),
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
              rejectUnauthorized: configService.get('db.ssl'),
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
          Balance,
          BedType,
          CategoryType,
          Excursion,
          IdentificationType,
          Invoice,
          InvoiceDetaill,
          InvoiceType,
          Notification,
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
        MailerModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            transport: {
              host: configService.get<string>('mail.host'),
              port: configService.get<number>('mail.port'),
              secure: configService.get<boolean>('mail.secure'),
              auth: {
                user: configService.get<string>('mail.user'),
                pass: configService.get<string>('mail.password'),
              },
              sender: configService.get<string>('mail.sender'),
              to: configService.get<string>('mail.to'),
            },
          }),
        }),
      ],
      controllers: [],
      providers: [
        AccessSessionsRepository,
        AccommodationRepository,
        AdditionalRepository,
        BalanceRepository,
        BedTypeRepository,
        CategoryTypeRepository,
        ExcursionRepository,
        IdentificationTypeRepository,
        InvoiceRepository,
        InvoiceDetaillRepository,
        InvoiceTypeRepository,
        NotificationRepository,
        PaidTypeRepository,
        PayTypeRepository,
        PhoneCodeRepository,
        ProductRepository,
        RoleTypeRepository,
        StateTypeRepository,
        TaxeTypeRepository,
        UserRepository,
        BalanceService,
        RepositoryService,
        InvoiceEventsListener,
        MailsService,
        MailTemplateService,
        PasswordService,
        CronService,
        GeneralInvoiceDetaillService,
        NotificationService,
        UserService,
      ],
      exports: [
        TypeOrmModule,
        AccessSessionsRepository,
        AccommodationRepository,
        AdditionalRepository,
        BalanceRepository,
        BedTypeRepository,
        CategoryTypeRepository,
        ExcursionRepository,
        IdentificationTypeRepository,
        InvoiceRepository,
        InvoiceDetaillRepository,
        InvoiceTypeRepository,
        NotificationRepository,
        PaidTypeRepository,
        PayTypeRepository,
        PhoneCodeRepository,
        ProductRepository,
        RoleTypeRepository,
        StateTypeRepository,
        TaxeTypeRepository,
        UserRepository,
        BalanceService,
        RepositoryService,
        InvoiceEventsListener,
        MailsService,
        MailTemplateService,
        PasswordService,
        CronService,
        GeneralInvoiceDetaillService,
        NotificationService,
        UserService,
      ],
    };
  }
}
