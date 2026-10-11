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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../../shared/entities/user.entity';

/**
 * Roles que siguen las órdenes en vivo (cocina, meseros, recepción, admin).
 * Un huésped (USER) no entra: antes `server.emit` le mandaba a cualquier sesión
 * conectada los renglones de las órdenes de TODOS.
 */
const ORDER_ROOM_ROLES = ['SUPERADMIN', 'ADMIN', 'EMP', 'CHE', 'MES'];

/**
 * Room de órdenes por organización. Las facturas y el staff que aún no tienen
 * organización asignada comparten `unassigned`: con un solo hotel es el mismo
 * comportamiento de antes, y nunca se cruza con un hotel que sí la tiene.
 * Desaparece cuando el backfill de la fase 3 deje todo con organización.
 */
export const ordersRoom = (organizationalId?: string | null) =>
  `org_${organizationalId || 'unassigned'}:orders`;

@WebSocketGateway({
  cors: {
    origin: process.env.APP_CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) || [],
  },
  namespace: 'orders',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly _jwtService: JwtService,
    private readonly _configService: ConfigService,
    private readonly _dataSource: DataSource,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      console.warn('[Socket] No token provided, disconnecting', client.id);
      client.disconnect();
      return;
    }
    try {
      const payload = this._jwtService.verify(token);
      // El room personal solo se acepta para el dueño del token (ver
      // `handleJoinUserRoom`): sin esto cualquier sesión podía escuchar los
      // avisos privados de otro usuario.
      client.data.userId = payload?.sub ?? payload?.id;
      console.log('[Socket] Client connected:', client.id);
    } catch (err) {
      console.warn('[Socket] Invalid token, disconnecting', client.id, err);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Cambio en una orden, a las sesiones de staff de SU organización.
   * (Hoy nadie lo llama; antes hacía `server.emit` a todos los conectados.)
   */
  emitOrderUpdate(orderData: OrderUpdate, organizationalId: string | null) {
    this.server.to(ordersRoom(organizationalId)).emit('orderUpdated', orderData);
  }

  emitToUser(userId: string, orderData: OrderUpdate) {
    this.server.to(`user_${userId}`).emit('orderUpdated', orderData);
  }

  /** Solicitud de reserva hecha por un huésped; la recibe el personal. */
  emitReservationToUser(userId: string, payload: Record<string, unknown>) {
    this.server.to(`user_${userId}`).emit('reservationRequested', payload);
  }

  /** Aviso privado para un huésped (estado de su reserva). */
  emitGuestNotification(userId: string, payload: Record<string, unknown>) {
    this.server.to(`user_${userId}`).emit('guestNotification', payload);
  }

  /** Renglón nuevo en una orden de mesa, solo al staff de esa organización. */
  emitInvoiceItemAdded(
    invoiceId: number,
    payload: InvoiceItemAddedPayload,
    organizationalId: string | null,
  ) {
    this.server
      .to(ordersRoom(organizationalId))
      .emit('invoiceItemAdded', { invoiceId, ...payload });
  }

  /**
   * La room NO la elige el cliente: sale del usuario del token. El cliente solo
   * dice "quiero las órdenes" y el servidor decide de qué organización, y si su
   * rol puede verlas.
   */
  @SubscribeMessage('joinOrders')
  async handleJoinOrders(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (!userId) return { event: 'joinRejected', data: 'Sin sesión' };

    const user = await this._dataSource.getRepository(User).findOne({
      where: { userId },
      relations: ['roleType', 'organizational'],
    });
    if (!user || !ORDER_ROOM_ROLES.includes(user.roleType?.code)) {
      return { event: 'joinRejected', data: 'Sin permiso para ver órdenes' };
    }

    // Una sesión solo está en la room de su organización.
    const room = ordersRoom(user.organizational?.organizationalId);
    for (const r of client.rooms) {
      if (r !== room && r.endsWith(':orders')) client.leave(r);
    }
    client.join(room);
    return { event: 'joined', data: 'Joined to orders room' };
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(client: Socket, data: { userId: string }) {
    if (data.userId && data.userId === client.data?.userId) {
      client.join(`user_${data.userId}`);
      return { event: 'joinedUser', data: `Joined to user_${data.userId}` };
    }
  }
}
