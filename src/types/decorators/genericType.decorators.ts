import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { GetTypeByIdResponseDto } from '../dtos/genericType.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';

export function PaginatedListByTypeDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene una lista paginada por tipo' }),
    ApiOkResponse({ type: ResponsePaginationDto }),
  );
}

export function CreateTypeDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Crea un nuevo registro por tipo' }),
    ApiOkResponse({ type: CreatedRecordResponseDto }),
    ApiConflictResponse({ type: DuplicatedResponseDto }),
  );
}

export function GetAllAdditionalTypesDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene todos los tipos adicionales' }),
    ApiOkResponse({ description: 'Lista completa de AdditionalType' }),
  );
}

export function GetAllDiscountTypesDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene todos los tipos de descuento' }),
    ApiOkResponse({ description: 'Lista completa de DiscountType' }),
  );
}

export function FindOneByTypeAndIdDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene un registro por tipo y su ID' }),
    ApiOkResponse({ type: GetTypeByIdResponseDto }),
  );
}

export function UpdateTypeDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Actualiza un registro por tipo y su ID' }),
    ApiOkResponse({ type: UpdateRecordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function DeleteTypeDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Elimina un registro por tipo y su ID' }),
    ApiOkResponse({ type: DeleteReCordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}
