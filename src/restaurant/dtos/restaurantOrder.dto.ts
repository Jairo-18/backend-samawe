import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum RestaurantOrderState {
  PENDING = 'PENDIENTE',
  COOKING = 'EN COCINA',
  READY = 'LISTO PARA SERVIR',
  SERVED = 'ENTREGADO',
  CANCELLED = 'CANCELADO',
}

export class UpdateOrderStateDto {
  @ApiProperty({
    enum: RestaurantOrderState,
    example: RestaurantOrderState.COOKING,
    description: 'El nuevo estado de la orden',
  })
  @IsEnum(RestaurantOrderState, {
    message:
      'El estado debe ser uno de: PENDIENTE, EN COCINA, LISTO PARA SERVIR, ENTREGADO, CANCELADO',
  })
  newStateCode: RestaurantOrderState;
}
