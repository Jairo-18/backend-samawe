import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { Menu } from './../../shared/entities/menu.entity';

export function CreateMenuDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Crea un nuevo menú con recetas asociadas' }),
    ApiOkResponse({ type: CreatedRecordResponseDto }),
    ApiBadRequestResponse({
      description: 'Una o más recetas no fueron encontradas',
    }),
  );
}

export function UpdateMenuDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Actualiza un menú por su ID' }),
    ApiOkResponse({ type: UpdateRecordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
    ApiBadRequestResponse({
      description: 'Una o más recetas no fueron encontradas',
    }),
  );
}

export function GetPaginatedMenuDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtiene una lista paginada de menús con sus recetas',
    }),
    ApiOkResponse({ type: ResponsePaginationDto<Menu> }),
  );
}

export function FindOneMenuDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtiene un menú por su ID con recetas e ingredientes',
    }),
    ApiOkResponse({ description: 'Menú encontrado con sus recetas' }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function DeleteMenuDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Elimina un menú por su ID (soft delete)' }),
    ApiOkResponse({ type: DeleteReCordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function RemoveProductFromMenuDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Quita un platillo específico del menú' }),
    ApiOkResponse({ type: UpdateRecordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
    ApiBadRequestResponse({
      description: 'El producto no está asociado al menú',
    }),
  );
}
