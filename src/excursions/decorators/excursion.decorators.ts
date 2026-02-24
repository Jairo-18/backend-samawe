import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { PartialExcursionDto } from './../dtos/crudExcursion.dto';
import {
  CreateExcursionDto,
  GetAllExcursionsResposeDto,
  GetExcursionDto,
} from './../dtos/excursion.dto';
import {
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import { Excursion } from './../../shared/entities/excursion.entity';

export function GetPaginatedPartialDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene una lista paginada parcial de pasadías' }),
    ApiOkResponse({ type: ResponsePaginationDto<PartialExcursionDto> }),
  );
}

export function CreateExcursionDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Crea un nuevo pasadía' }),
    ApiOkResponse({ type: CreateExcursionDto }),
    ApiConflictResponse({ type: DuplicatedResponseDto }),
  );
}

export function FindAllExcursionsDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene todos los pasadías' }),
    ApiOkResponse({ type: GetAllExcursionsResposeDto }),
  );
}

export function UpdateExcursionDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Actualiza un pasadía por su ID' }),
    ApiOkResponse({ type: UpdateRecordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function GetPaginatedListDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Obtiene una lista paginada detallada de pasadías',
    }),
    ApiOkResponse({ type: ResponsePaginationDto<Excursion> }),
  );
}

export function FindOneExcursionDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene un pasadía por su ID' }),
    ApiOkResponse({ type: GetExcursionDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function DeleteExcursionDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Elimina un pasadía por su ID' }),
    ApiOkResponse({ type: DeleteReCordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function UploadImageDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Sube una imagen para el pasadía' }),
  );
}

export function GetImagesDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene las imágenes de un pasadía' }),
  );
}

export function DeleteImageDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Elimina una imagen de un pasadía' }),
  );
}
