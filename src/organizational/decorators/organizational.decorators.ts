import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  UpdateRecordResponseDto,
} from '../../shared/dtos/response.dto';
import {
  GetOrganizationalResponseDto,
  GetOrganizationalMediaMapResponseDto,
} from '../dtos/organizational.dto';

export function CreateOrganizationalDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Crear una nueva organización' }),
    ApiResponse({
      status: 201,
      description: 'Organización creada exitosamente',
      type: CreatedRecordResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Datos inválidos' }),
  );
}

export function FindAllOrganizationalDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtener todas las organizaciones' }),
    ApiResponse({
      status: 200,
      description: 'Lista de organizaciones (solo para super admins, etc.)',
    }),
  );
}

export function FindAllMediaTypesDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtener los tipos de media (MediaTypes)' }),
    ApiResponse({
      status: 200,
      description: 'Lista de tipos de archivo (logo, banner, etc.)',
    }),
  );
}

export function FindOneOrganizationalDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtener una organización por su UUID' }),
    ApiResponse({
      status: 200,
      description: 'Retorna los datos de la organización',
      type: GetOrganizationalResponseDto,
    }),
    ApiResponse({ status: 404, description: 'Organización no encontrada' }),
  );
}

export function GetMediaMapDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary:
        'Obtener un mapa de imágenes para una organización (logo, hero...)',
    }),
    ApiResponse({
      status: 200,
      description: 'Retorna el mapa en formato objeto',
      type: GetOrganizationalMediaMapResponseDto,
    }),
  );
}

export function UpdateOrganizationalDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Actualizar una organización' }),
    ApiResponse({
      status: 200,
      description: 'Organización actualizada exitosamente',
      type: UpdateRecordResponseDto,
    }),
    ApiResponse({ status: 404, description: 'Organización no encontrada' }),
  );
}

export function DeleteOrganizationalDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Eliminar una organización de forma lógica o permanente',
    }),
    ApiResponse({
      status: 200,
      description: 'Organización eliminada exitosamente',
      type: DeleteReCordResponseDto,
    }),
    ApiResponse({ status: 404, description: 'Organización no encontrada' }),
  );
}

export function AddMediaDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Añadir un nuevo archivo multimedia a una organización',
    }),
    ApiResponse({
      status: 201,
      description: 'Media creada y asignada a la organización',
      type: CreatedRecordResponseDto,
    }),
  );
}

export function UpdateMediaDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Actualizar la información de un archivo multimedia',
    }),
    ApiResponse({
      status: 200,
      description: 'Datos de media actualizados exitosamente',
      type: UpdateRecordResponseDto,
    }),
    ApiResponse({ status: 404, description: 'Media no encontrada' }),
  );
}

export function UploadMediaDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Subir un archivo multimedia (multipart) para la organización',
    }),
    ApiResponse({
      status: 201,
      description: 'Archivo subido y registrado exitosamente',
      type: CreatedRecordResponseDto,
    }),
  );
}

export function DeleteMediaDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Eliminar un archivo multimedia' }),
    ApiResponse({
      status: 200,
      description: 'Media eliminada exitosamente',
      type: DeleteReCordResponseDto,
    }),
    ApiResponse({ status: 404, description: 'Media no encontrada' }),
  );
}
