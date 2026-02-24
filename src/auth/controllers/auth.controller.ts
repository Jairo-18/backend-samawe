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
import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  SignInDocs,
  RefreshTokenDocs,
  SignOutDocs,
} from '../decorators/auth.decorators';

@Controller('auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(private readonly _authUC: AuthUC) {}

  @Post('/sign-in')
  @SignInDocs()
  async signIn(@Body() body: LoginDto): Promise<SignInResponseDto> {
    const data = await this._authUC.login(body);
    return {
      statusCode: HttpStatus.OK,
      message: 'Bienvenid@',
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
      message: 'Sesión finalizada correctamente',
    };
  }

  @Post('/recovery-password')
  async recoveryPassword(
    @Body() body: RecoveryPasswordBodyDto,
  ): Promise<{ statusCode: number; message: string }> {
    await this._authUC.recoveryPassword(body);
    return {
      statusCode: HttpStatus.OK,
      message: 'Correo enviado correctamente',
    };
  }
}
