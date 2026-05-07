import {
  LoginDto,
  RecoveryPasswordBodyDto,
  RefreshTokenBodyDto,
  SignOutBodyDto,
  SignOutResponseDto,
  SignInResponseDto,
  RefreshTokenResponseDto,
} from '../dtos/auth.dto';
import { AuthUC } from '../useCases/auth.UC';
import { AuthService } from '../services/auth.service';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import {
  SignInDocs,
  RefreshTokenDocs,
  SignOutDocs,
} from '../decorators/auth.decorators';
import { GoogleBusinessService } from '../../organizational/services/google-business.service';
import { SkipApiKey } from '../../shared/decorators/skip-api-key.decorator';

@Controller('auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(
    private readonly _authUC: AuthUC,
    private readonly _authService: AuthService,
    private readonly _configService: ConfigService,
    private readonly _googleBusinessService: GoogleBusinessService,
  ) {}

  @Post('/sign-in')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @SignInDocs()
  async signIn(@Body() body: LoginDto): Promise<SignInResponseDto> {
    const data = await this._authUC.login(body);
    return {
      statusCode: HttpStatus.OK,
      message: 'api.auth.welcome',
      data: {
        tokens: data.tokens,
        user: data.user,
        accessSessionId: data.session?.accessSessionId,
      },
    };
  }

  @Post('refresh-token')
  @RefreshTokenDocs()
  async refreshToken(
    @Body() body: RefreshTokenBodyDto,
  ): Promise<RefreshTokenResponseDto> {
    const data = await this._authUC.refreshToken(body);
    return {
      statusCode: HttpStatus.OK,
      data: {
        tokens: data.tokens,
        user: {
          userId: data.user.userId,
          roleType: {
            roleTypeId: data.user.role.roleId,
            name: data.user.role.name,
          },
          organizationalId: data.user.organizationalId ?? null,
        },
      },
    };
  }

  @Post('/sign-out')
  @UseGuards(AuthGuard())
  @SignOutDocs()
  @UseGuards(AuthGuard())
  async signOut(@Body() body: SignOutBodyDto): Promise<SignOutResponseDto> {
    await this._authUC.signOut(body);
    return {
      statusCode: HttpStatus.OK,
      message: 'api.auth.sign_out',
    };
  }

  @Post('/recovery-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async recoveryPassword(
    @Body() body: RecoveryPasswordBodyDto,
  ): Promise<{ statusCode: number; message: string }> {
    await this._authUC.recoveryPassword(body);
    return {
      statusCode: HttpStatus.OK,
      message: 'api.auth.recovery_sent',
    };
  }

  @Get('/google')
  @SkipApiKey()
  @UseGuards(AuthGuard('google'))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleAuth(@Req() _req: any) {
    // Passport redirige automáticamente a Google
  }

  @Get('/google-business/callback')
  @SkipApiKey()
  async googleBusinessCallback(
    @Query('code') code: string,
    @Query('state') organizationalId: string,
    @Res() res: any,
  ) {
    const frontendUrl =
      this._configService.get<string>('APP_FRONTEND_URL') || 'http://localhost:4200';
    try {
      await this._googleBusinessService.handleCallback(code, organizationalId);
      return res.redirect(
        `${frontendUrl}/organizational/application?googleBusiness=success`,
      );
    } catch {
      return res.redirect(
        `${frontendUrl}/organizational/application?googleBusiness=error`,
      );
    }
  }

  @Get('/google/callback')
  @SkipApiKey()
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: any) {
    const data = await this._authService.googleSignIn(req.user);
    const frontendUrl =
      this._configService.get<string>('APP_FRONTEND_URL') ||
      'http://localhost:4200';

    const params = new URLSearchParams({
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
      userId: data.user.userId,
      roleTypeId: data.user.roleType?.roleTypeId || '',
      roleTypeName: data.user.roleType?.name?.['es'] || '',
      accessSessionId: data.session.accessSessionId,
      organizationalId: data.user.organizationalId || '',
      avatarUrl: data.user.avatarUrl || '',
      firstName: data.user.firstName || '',
      lastName: data.user.lastName || '',
      email: data.user.email || '',
      isNewUser: data.user.isNewUser ? 'true' : 'false',
    });

    return res.redirect(
      `${frontendUrl}/auth/google/callback#${params.toString()}`,
    );
  }
}
