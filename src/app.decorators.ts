import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

export function HealthDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Health check endpoint' }),
    ApiResponse({ status: 200, description: 'Server is healthy' }),
  );
}

export function GetServerInfoDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get server network information' }),
    ApiResponse({
      status: 200,
      description:
        'Returns server IP addresses and port for client configuration',
    }),
  );
}

export function GetRelatedDataDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtiene todos los catálogos/tipos en una sola llamada',
    }),
    ApiResponse({ status: 200, description: 'Catálogo unificado de tipos' }),
  );
}
