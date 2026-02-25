import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'orders',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Notifica a todos los clientes sobre un cambio en un pedido.
   * @param orderData Datos del pedido actualizado.
   */
  emitOrderUpdate(orderData: any) {
    this.server.emit('orderUpdated', orderData);
  }

  @SubscribeMessage('joinOrders')
  handleJoinOrders(client: Socket) {
    client.join('orderRoom');
    return { event: 'joined', data: 'Joined to orders room' };
  }
}
