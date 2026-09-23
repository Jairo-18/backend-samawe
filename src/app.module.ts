import { CronJobModule } from './cronJobs/cronJob.module';
import { GenericTypeModule } from './types/genericType.module';
import { ExcursionModule } from './excursions/excursion.module';
import { ProductModule } from './products/product.module';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './shared/guards/api-key.guard';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { config } from './config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AccommodationModule } from './accommodations/accommodation.module';
import { InvoiceModule } from './invoices/invoice.module';
import { EarningModule } from './earnings/earning.module';
import { RecipeModule } from './recipes/recipe.module';
import { MenuModule } from './menus/menu.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SocketModule } from './socket/socket.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizationalModule } from './organizational/organizational.module';
import { BenefitSectionModule } from './benefit-section/benefitSection.module';
import { LegalModule } from './legal/legal.module';
import { ReviewModule } from './reviews/review.module';
import { TranslationsModule } from './translations/translations.module';
import { FactusModule } from './factus/factus.module';
import { RedisModule } from './redis/redis.module';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.development',
    }),
    RedisModule,
    // El contador del throttler vive en memoria por defecto: con N instancias
    // el límite real se multiplica por N, porque cada una lleva su propia
    // cuenta. Con Redis el contador es uno solo y el límite vuelve a ser el
    // que dice la configuración. Sin `REDIS_URL` se queda en memoria, igual
    // que antes.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('REDIS_URL');
        return {
          throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
          ...(url
            ? { storage: new ThrottlerStorageRedisService(url) }
            : {}),
        };
      },
    }),
    SocketModule,
    ServeStaticModule.forRoot({
      rootPath:
        process.platform === 'win32'
          ? join(process.cwd(), 'uploads')
          : '/app/uploads',
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (res) => {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
        },
      },
    }),
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AccommodationModule,
    AuthModule,
    CronJobModule,
    EarningModule,
    ExcursionModule,
    GenericTypeModule,
    InvoiceModule,
    ProductModule,
    RecipeModule,
    MenuModule,
    UserModule,
    NotificationsModule,
    OrganizationalModule,
    BenefitSectionModule,
    LegalModule,
    ReviewModule,
    TranslationsModule,
    FactusModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
