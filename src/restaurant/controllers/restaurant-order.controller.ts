import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantOrderService } from '../services/restaurant-order.service';

class UpdateDishStateDto {
  newStateCode: string; // PENDING, COOKING, READY, SERVED, CANCELLED
}

class UpdateMultipleDishesStateDto {
  invoiceDetailIds: number[];
  newStateCode: string;
}

class UpdateOrderStateDto {
  newStateCode: string; // Estado general de la orden
}

@Controller('restaurant/orders')
@ApiTags('Órdenes Restaurante')
export class RestaurantOrderController {
  constructor(
    private readonly _restaurantOrderService: RestaurantOrderService,
  ) {}

  @Patch('dish/:invoiceDetailId/state')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: '🔥 Cambiar estado de un plato (REDUCE STOCK AL COCINAR)',
    description: `
      Cambia el estado de un plato. Estados disponibles:
      - PENDING: Pendiente de cocina
      - COOKING: 🔥 En preparación (REDUCE AUTOMÁTICAMENTE EL STOCK DE INGREDIENTES)
      - READY: Listo para servir
      - SERVED: Servido al cliente
      - CANCELLED: Cancelado
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newStateCode: {
          type: 'string',
          example: 'COOKING',
          description:
            'Código del nuevo estado (PENDING, COOKING, READY, SERVED, CANCELLED)',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Estado del plato actualizado y stock reducido si aplica',
  })
  async updateDishState(
    @Param('invoiceDetailId') invoiceDetailId: string,
    @Body() updateDto: UpdateDishStateDto,
  ) {
    const dish = await this._restaurantOrderService.updateDishState(
      parseInt(invoiceDetailId),
      updateDto.newStateCode,
    );
    return {
      message: `Estado actualizado a ${updateDto.newStateCode}`,
      statusCode: HttpStatus.OK,
      data: dish,
    };
  }

  @Patch('dishes/state')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Cambiar estado de múltiples platos a la vez',
    description: 'Útil para marcar toda una mesa como lista o servida',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        invoiceDetailIds: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2, 3],
        },
        newStateCode: { type: 'string', example: 'READY' },
      },
    },
  })
  @ApiOkResponse({ description: 'Estados actualizados' })
  async updateMultipleDishesState(
    @Body() updateDto: UpdateMultipleDishesStateDto,
  ) {
    const dishes = await this._restaurantOrderService.updateMultipleDishesState(
      updateDto.invoiceDetailIds,
      updateDto.newStateCode,
    );
    return {
      message: `${dishes.length} platos actualizados`,
      statusCode: HttpStatus.OK,
      data: dishes,
    };
  }

  @Patch('invoice/:invoiceId/state')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Cambiar estado general de una orden (Invoice)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newStateCode: {
          type: 'string',
          example: 'COMPLETED',
          description:
            'Estado de la orden (PENDING, IN_PROGRESS, COMPLETED, PAID, CANCELLED)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Estado de orden actualizado' })
  async updateOrderState(
    @Param('invoiceId') invoiceId: string,
    @Body() updateDto: UpdateOrderStateDto,
  ) {
    await this._restaurantOrderService.updateOrderState(
      parseInt(invoiceId),
      updateDto.newStateCode,
    );
    return {
      message: `Orden actualizada a ${updateDto.newStateCode}`,
      statusCode: HttpStatus.OK,
    };
  }

  @Get('pending')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Obtener platos pendientes de cocina',
    description: 'Lista de platos con estado PENDING ordenados por antigüedad',
  })
  @ApiOkResponse({ description: 'Platos pendientes' })
  async getPendingOrders() {
    const orders = await this._restaurantOrderService.getPendingOrders();
    return {
      statusCode: HttpStatus.OK,
      data: orders,
      count: orders.length,
    };
  }

  @Get('cooking')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Obtener platos en preparación',
    description: 'Lista de platos con estado COOKING ordenados por tiempo',
  })
  @ApiOkResponse({ description: 'Platos en cocina' })
  async getCookingOrders() {
    const orders = await this._restaurantOrderService.getCookingOrders();
    return {
      statusCode: HttpStatus.OK,
      data: orders,
      count: orders.length,
    };
  }

  @Get('ready')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Obtener platos listos para servir',
    description: 'Lista de platos con estado READY',
  })
  @ApiOkResponse({ description: 'Platos listos' })
  async getReadyOrders() {
    const orders = await this._restaurantOrderService.getReadyOrders();
    return {
      statusCode: HttpStatus.OK,
      data: orders,
      count: orders.length,
    };
  }

  @Get('invoice/:invoiceId/check-ready')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Verificar si todos los platos de una orden están listos',
  })
  @ApiOkResponse({ description: 'Estado de la orden completa' })
  async checkIfOrderReady(@Param('invoiceId') invoiceId: string) {
    const isReady = await this._restaurantOrderService.checkIfOrderReady(
      parseInt(invoiceId),
    );
    return {
      statusCode: HttpStatus.OK,
      data: { invoiceId: parseInt(invoiceId), allDishesReady: isReady },
    };
  }

  @Post('dish/:invoiceDetailId/cancel')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Cancelar un plato',
    description:
      '⚠️ ADVERTENCIA: Si el plato ya fue cocinado, NO se restaurará el stock de ingredientes',
  })
  @ApiOkResponse({ description: 'Plato cancelado' })
  async cancelDish(@Param('invoiceDetailId') invoiceDetailId: string) {
    const dish = await this._restaurantOrderService.cancelDish(
      parseInt(invoiceDetailId),
    );
    return {
      message: 'Plato cancelado',
      statusCode: HttpStatus.OK,
      data: dish,
    };
  }
}
