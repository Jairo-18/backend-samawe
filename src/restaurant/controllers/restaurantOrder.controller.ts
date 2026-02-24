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
import { ApiTags } from '@nestjs/swagger';
import {
  UpdateOrderStateDocs,
  GetPendingOrdersDocs,
  GetCookingOrdersDocs,
  GetReadyOrdersDocs,
  CancelOrderDocs,
} from '../decorators/restaurantOrder.decorators';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantOrderService } from '../services/restaurantOrder.service';
import { UpdateOrderStateUseCase } from '../useCases/restaurantOrderUC.uc';
import {
  UpdateOrderStateDto,
  RestaurantOrderState,
} from '../dtos/restaurantOrder.dto';

@Controller('restaurant/orders')
@ApiTags('Órdenes Restaurante')
@UseGuards(AuthGuard())
export class RestaurantOrderController {
  constructor(
    private readonly _restaurantOrderService: RestaurantOrderService,
    private readonly _updateOrderStateUseCase: UpdateOrderStateUseCase,
  ) {}

  @Patch('invoice/:invoiceId/state')
  @UpdateOrderStateDocs()
  async updateOrderState(
    @Param('invoiceId') invoiceId: string,
    @Body() updateDto: UpdateOrderStateDto,
  ) {
    await this._updateOrderStateUseCase.execute(
      parseInt(invoiceId),
      updateDto.newStateCode,
    );
    return {
      message: `Orden actualizada a ${updateDto.newStateCode}`,
      statusCode: HttpStatus.OK,
    };
  }

  @Get('pending')
  @GetPendingOrdersDocs()
  async getPendingOrders() {
    const orders = await this._restaurantOrderService.getPendingOrders();
    return {
      statusCode: HttpStatus.OK,
      data: orders,
      count: orders.length,
    };
  }

  @Get('cooking')
  @GetCookingOrdersDocs()
  async getCookingOrders() {
    const orders = await this._restaurantOrderService.getCookingOrders();
    return {
      statusCode: HttpStatus.OK,
      data: orders,
      count: orders.length,
    };
  }

  @Get('ready')
  @GetReadyOrdersDocs()
  async getReadyOrders() {
    const orders = await this._restaurantOrderService.getReadyOrders();
    return {
      statusCode: HttpStatus.OK,
      data: orders,
      count: orders.length,
    };
  }

  @Post('invoice/:invoiceId/cancel')
  @CancelOrderDocs()
  async cancelOrder(@Param('invoiceId') invoiceId: string) {
    await this._updateOrderStateUseCase.execute(
      parseInt(invoiceId),
      RestaurantOrderState.CANCELLED,
    );
    return {
      message: 'Orden cancelada',
      statusCode: HttpStatus.OK,
    };
  }
}
