import {
  LoginDto,
  RefreshTokenBodyDto,
  RefreshTokenResponseDto,
  SignInResponseDto,
  SignOutBodyDto,
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

@Controller('auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(private readonly authUC: AuthUC) {}

  @Post('sign-in')
  @ApiOkResponse({ type: SignInResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedException })
  async signIn(@Body() user: LoginDto): Promise<SignInResponseDto> {
    const data = await this.authUC.login(user);
    return {
      statusCode: HttpStatus.OK,
      message: 'Bienvenid@',
      data,
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

  @Post('sign-out')
  @ApiOkResponse()
  @ApiUnauthorizedResponse({ type: UnauthorizedException })
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async signOut(@Body() body: SignOutBodyDto) {
    return await this.authUC.signOut(body);
  }
}
