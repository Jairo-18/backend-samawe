import { CronJobModule } from './cronJobs/cronJob.module';
import { GenericTypeModule } from './types/genericType.module';
import { ExcursionModule } from './excursions/excursion.module';
import { ProductModule } from './products/product.module';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { config } from './config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AccommodationModule } from './accommodations/accommodation.module';
import { InvoiceModule } from './invoices/invoice.module';
import { EarningModule } from './earnings/earning.module';
import { ScheduleModule } from '@nestjs/schedule';
import { IngredientModule } from './ingredients/ingredient.module';
import { RecipeModule } from './recipes/recipe.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

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
    ServeStaticModule.forRoot({
      rootPath:
        process.platform === 'win32'
          ? join(process.cwd(), 'uploads')
          : '/app/uploads',
      serveRoot: '/uploads',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../node_modules/swagger-ui-dist'),
      serveRoot: '/docs',
    }),
    ScheduleModule.forRoot(),

    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AccommodationModule,
    AuthModule,
    CronJobModule,
    EarningModule,
    ExcursionModule,
    GenericTypeModule,
    IngredientModule,
    InvoiceModule,
    ProductModule,
    RecipeModule,
    RestaurantModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
