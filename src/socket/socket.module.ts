import { Module, Global } from '@nestjs/common';
import { OrdersGateway } from './gateways/orders.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [NotificationsModule],
  providers: [OrdersGateway],
  exports: [OrdersGateway],
})
export class SocketModule {}
