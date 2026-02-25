import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { PartialAccommodationDto } from './../dtos/crudAccommodation.dto';
import { GetAcommodationDto } from './../dtos/accommodation.dto';
import {
  DuplicatedResponseDto,
  DeleteReCordResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
  CreatedRecordResponseDto,
} from './../../shared/dtos/response.dto';
import { Accommodation } from './../../shared/entities/accommodation.entity';

export function GetPaginatedPartialDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtiene una lista paginada parcial de hospedajes',
    }),
    ApiOkResponse({ type: ResponsePaginationDto<PartialAccommodationDto> }),
  );
}

export function CreateAccommodationDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Crea un nuevo hospedaje' }),
    ApiOkResponse({ type: CreatedRecordResponseDto }),
    ApiConflictResponse({ type: DuplicatedResponseDto }),
  );
}

export function UpdateAccommodationDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Actualiza un hospedaje por su ID' }),
    ApiOkResponse({ type: UpdateRecordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function GetPaginatedListDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Obtiene una lista paginada detallada de hospedajes',
    }),
    ApiOkResponse({ type: ResponsePaginationDto<Accommodation> }),
  );
}

export function FindOneAccommodationDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene un hospedaje por su ID' }),
    ApiOkResponse({ type: GetAcommodationDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function DeleteAccommodationDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Elimina un hospedaje por su ID' }),
    ApiOkResponse({ type: DeleteReCordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function UploadImageDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Sube una imagen para el hospedaje' }),
  );
}

export function GetImagesDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene las imágenes de un hospedaje' }),
  );
}

export function DeleteImageDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Elimina una imagen de un hospedaje' }),
  );
}
