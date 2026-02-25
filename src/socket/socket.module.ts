import { Module, Global } from '@nestjs/common';
import { OrdersGateway } from './gateways/orders.gateway';

@Global()
@Module({
  providers: [OrdersGateway],
  exports: [OrdersGateway],
})
export class SocketModule {}
