import {
  InvalidAccessDataResponseDto,
  LoginDto,
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
  constructor(private readonly authUC: AuthUC) {}

  @Post('/sign-in')
  @ApiOkResponse({ type: SignInResponseDto })
  @ApiUnauthorizedResponse({
    description: INVALID_ACCESS_DATA_MESSAGE,
    type: InvalidAccessDataResponseDto,
  })
  async signIn(@Body() body: LoginDto): Promise<SignInResponseDto> {
    const data = await this.authUC.login(body);
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
    const data = await this.authUC.refreshToken(body);
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Post('/sign-out')
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async signOut(@Body() body: SignOutBodyDto): Promise<SignOutResponseDto> {
    await this.authUC.signOut(body);
    return {
      statusCode: HttpStatus.OK,
      message: 'Sesión finalizada correctamente',
    };
  }
}
