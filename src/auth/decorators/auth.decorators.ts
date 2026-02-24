import { applyDecorators, UnauthorizedException } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  InvalidAccessDataResponseDto,
  RefreshTokenResponseDto,
  SignInResponseDto,
} from '../dtos/auth.dto';
import { INVALID_ACCESS_DATA_MESSAGE } from '../constants/messages.constants';

export function SignInDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Iniciar sesión' }),
    ApiOkResponse({ type: SignInResponseDto }),
    ApiUnauthorizedResponse({
      description: INVALID_ACCESS_DATA_MESSAGE,
      type: InvalidAccessDataResponseDto,
    }),
  );
}

export function RefreshTokenDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Refrescar token de acceso' }),
    ApiOkResponse({ type: RefreshTokenResponseDto }),
    ApiUnauthorizedResponse({ type: UnauthorizedException }),
  );
}

export function SignOutDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Cerrar sesión' }),
    ApiOkResponse(),
    ApiUnauthorizedResponse(),
  );
}
