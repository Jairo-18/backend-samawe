import { Injectable } from '@nestjs/common';
import { RestaurantOrderState } from '../dtos/restaurantOrder.dto';
import { RestaurantOrderService } from '../services/restaurantOrder.service';

@Injectable()
export class UpdateOrderStateUseCase {
  constructor(
    private readonly _restaurantOrderService: RestaurantOrderService,
  ) {}

  async execute(
    invoiceId: number,
    newStateCode: RestaurantOrderState,
  ): Promise<void> {
    return await this._restaurantOrderService.updateOrderState(
      invoiceId,
      newStateCode,
    );
  }
}
