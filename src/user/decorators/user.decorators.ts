import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ResponsePaginationDto } from 'src/shared/dtos/pagination.dto';
import { PartialUserDto } from '../dtos/crudUser.dto';
import { PhoneCode } from './../../shared/entities/phoneCode.entity';
import { User } from 'src/shared/entities/user.entity';
import { GetUserResponseDto } from '../dtos/user.dto';
import {
  CreatedRecordResponseDto,
  DuplicatedResponseDto,
  UpdateRecordResponseDto,
  NotFoundResponseDto,
  DeleteReCordResponseDto,
} from '../../shared/dtos/response.dto';
import {
  NOT_FOUND_RESPONSE,
  UPDATED_RESPONSE,
} from './../../shared/constants/response.constant';

export function GetPaginatedPartialDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Obtiene una lista paginada parcial de usuarios' }),
    ApiOkResponse({ type: ResponsePaginationDto<PartialUserDto> }),
    ApiBearerAuth(),
  );
}

export function PaginatedPhoneCodeSelectDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Obtiene una lista paginada de códigos telefónicos',
    }),
    ApiOkResponse({ type: ResponsePaginationDto<PhoneCode> }),
    ApiBearerAuth(),
  );
}

export function GetPaginatedListDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Obtiene una lista paginada detallada de usuarios',
    }),
    ApiOkResponse({ type: ResponsePaginationDto<User> }),
    ApiBearerAuth(),
  );
}

export function CreateUserDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Crea un nuevo usuario' }),
    ApiOkResponse({ type: CreatedRecordResponseDto }),
    ApiConflictResponse({ type: DuplicatedResponseDto }),
  );
}

export function RegisterUserDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Registra un usuario desde el exterior' }),
    ApiOkResponse({ type: CreatedRecordResponseDto }),
    ApiConflictResponse({ type: DuplicatedResponseDto }),
  );
}

export function RecoveryPasswordDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Recupera contraseña restableciéndola a la por defecto',
    }),
    ApiOkResponse(UPDATED_RESPONSE),
    ApiNotFoundResponse(NOT_FOUND_RESPONSE),
  );
}

export function ChangePasswordDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Cambia la contraseña' }),
    ApiOkResponse(UPDATED_RESPONSE),
    ApiNotFoundResponse(NOT_FOUND_RESPONSE),
    ApiBearerAuth(),
  );
}

export function FindOneUserDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene un usuario por su ID' }),
    ApiOkResponse({ type: GetUserResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function UpdateUserDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Actualiza un usuario por su ID' }),
    ApiOkResponse({ type: UpdateRecordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function DeleteUserDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Elimina un usuario por su ID' }),
    ApiOkResponse({ type: DeleteReCordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}
