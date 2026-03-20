import { InvoiceItemAddedPayload } from './../../invoices/interfaces/invoiceDetail.interface';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OrderUpdate } from '../interfaces/order-socket.interface';
import { WebPushService } from '../../notifications/services/web-push.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'orders',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly _webPushService: WebPushService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Notifica a todos los clientes sobre un cambio en un pedido (socket + push).
   */
  emitOrderUpdate(orderData: OrderUpdate, targetUserIds?: string[]) {
    this.server.emit('orderUpdated', orderData);

    // Enviar Web Push a los usuarios especificados
    if (targetUserIds?.length) {
      this._webPushService.sendToAllUsers(targetUserIds, {
        title: `Orden ${orderData.code} actualizada`,
        body: `Mesa ${orderData.tableNumber || 'N/A'} → ${orderData.state}`,
        data: {
          invoiceId: orderData.invoiceId,
          url: '/recipes/restaurant-order',
        },
      });
    }
  }

  emitToUser(userId: string, orderData: OrderUpdate) {
    this.server.to(`user_${userId}`).emit('orderUpdated', orderData);

    // Enviar Web Push al usuario específico
    this._webPushService.sendToUser(userId, {
      title: `Orden ${orderData.code} actualizada`,
      body: `Mesa ${orderData.tableNumber || 'N/A'} → ${orderData.state}`,
      data: {
        invoiceId: orderData.invoiceId,
        url: '/recipes/restaurant-order',
      },
    });
  }

  emitInvoiceItemAdded(invoiceId: number, payload: InvoiceItemAddedPayload) {
    this.server.emit('invoiceItemAdded', { invoiceId, ...payload });
  }

  @SubscribeMessage('joinOrders')
  handleJoinOrders(client: Socket) {
    client.join('orderRoom');
    return { event: 'joined', data: 'Joined to orders room' };
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(client: Socket, data: { userId: string }) {
    if (data.userId) {
      client.join(`user_${data.userId}`);
      return { event: 'joinedUser', data: `Joined to user_${data.userId}` };
    }
  }
}

