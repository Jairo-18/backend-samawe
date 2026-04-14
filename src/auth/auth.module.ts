import { JwtStrategy } from './../shared/strategies/jwt.strategy';
import { GoogleStrategy } from './../shared/strategies/google.strategy';
import { AccessSessionsService } from './services/accessSessions.service';
import { UserService } from '../user/services/user.service';
import { SharedModule } from './../shared/shared.module';
import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthUC } from './useCases/auth.UC';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LocalStorageModule } from '../local-storage/local-storage.module';

@Module({
  imports: [
    SharedModule,
    LocalStorageModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: configService.get('jwt.expiresIn') },
      }),
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthUC,
    JwtService,
    UserService,
    AccessSessionsService,
    JwtStrategy,
    GoogleStrategy,
    ConfigService,
  ],
  exports: [JwtStrategy],
})
export class AuthModule {}
