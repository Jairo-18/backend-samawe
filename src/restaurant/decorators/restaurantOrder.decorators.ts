import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UpdateOrderStateDto } from '../dtos/restaurantOrder.dto';

export function UpdateOrderStateDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Cambiar estado general de una orden (REDUCE STOCK AL COCINAR)',
      description: `
        Cambia el estado de una orden. Estados disponibles:
        - PENDIENTE: Pendiente de cocina
        - EN COCINA: En preparación (REDUCE AUTOMÁTICAMENTE EL STOCK DE INGREDIENTES)
        - LISTO PARA SERVIR: Lista para servir
        - ENTREGADO: Servida al cliente
        - CANCELADO: Cancelada
      `,
    }),
    ApiBody({ type: UpdateOrderStateDto }),
    ApiOkResponse({ description: 'Estado de orden actualizado' }),
  );
}

export function GetPendingOrdersDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtener órdenes pendientes de cocina',
      description:
        'Lista de órdenes con estado PENDIENTE ordenados por antigüedad',
    }),
    ApiOkResponse({ description: 'Órdenes pendientes' }),
  );
}

export function GetCookingOrdersDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtener órdenes en preparación',
      description: 'Lista de órdenes con estado EN COCINA ordenados por tiempo',
    }),
    ApiOkResponse({ description: 'Órdenes en cocina' }),
  );
}

export function GetReadyOrdersDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtener órdenes listos para servir',
      description: 'Lista de órdenes con estado LISTO PARA SERVIR',
    }),
    ApiOkResponse({ description: 'Órdenes listos' }),
  );
}

export function CancelOrderDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Cancelar una orden',
      description:
        'ADVERTENCIA: Si la orden ya fue cocinada, NO se restaurará el stock de ingredientes',
    }),
    ApiOkResponse({ description: 'Orden cancelada' }),
  );
}
