import {
  InvalidAccessDataResponseDto,
  LoginDto,
  RecoveryPasswordBodyDto,
  RefreshTokenBodyDto,
  RefreshTokenResponseDto,
  SignInResponseDto,
  SignOutBodyDto,
  SignOutResponseDto,
} from '../dtos/auth.dto';
import { AuthUC } from '../useCases/auth.UC';
import {
  Body,
  Controller,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { INVALID_ACCESS_DATA_MESSAGE } from '../constants/messages.constants';

@Controller('auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(private readonly _authUC: AuthUC) {}

  @Post('/sign-in')
  @ApiOkResponse({ type: SignInResponseDto })
  @ApiUnauthorizedResponse({
    description: INVALID_ACCESS_DATA_MESSAGE,
    type: InvalidAccessDataResponseDto,
  })
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
  @ApiOkResponse({ type: RefreshTokenResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedException })
  async refreshToken(
    @Body() body: RefreshTokenBodyDto,
  ): Promise<RefreshTokenResponseDto> {
    const data = await this._authUC.refreshToken(body);
    return {
      statusCode: HttpStatus.OK,
      data: {
        tokens: data.tokens,
        user: {
          userId: data.user.userId, // Asegúrate de que data.user.id sea el campo correcto
          roleType: {
            roleTypeId: data.user.role.roleId, // Asegúrate de usar los nombres correctos de los campos
            name: data.user.role.name,
          },
        },
      },
    };
  }

  @Post('/sign-out')
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiBearerAuth()
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
