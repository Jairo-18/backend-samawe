import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { ParamsPaginationDto } from 'src/shared/dtos/pagination.dto';
import { NotificationType } from './../../shared/entities/notification.entity';
import { NotificationRepository } from './../../shared/repositories/notification.repository';
import { UserService } from './../../user/services/user.service';
import { Injectable } from '@nestjs/common';
import { PageMetaDto } from 'src/shared/dtos/pageMeta.dto';
import { In } from 'typeorm';
@Injectable()
export class NotificationService {
  constructor(
    private readonly _notificationRepository: NotificationRepository,
    private readonly _userService: UserService,
  ) {}

  async notifyToRoles(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    console.log('📢 Notificando a roles Empleado y Administrador...');

    const users = await this._userService.findByRoles([
      'Empleado',
      'Administrador',
    ]);
    console.log(`👥 Usuarios encontrados: ${users.length}`);

    if (users.length === 0) return [];

    // ✅ OPTIMIZACIÓN: Una sola consulta para todas las notificaciones existentes
    const userIds = users.map((user) => user.userId);
    const existingNotifications = await this._notificationRepository.find({
      where: {
        user: { userId: In(userIds) },
        type,
      },
      relations: ['user'],
    });

    // Crear un mapa para acceso rápido
    const existingByUser = new Map();
    existingNotifications.forEach((notification) => {
      const userId = notification.user.userId;
      if (!existingByUser.has(userId)) {
        existingByUser.set(userId, []);
      }
      existingByUser.get(userId).push(notification);
    });

    const notifs = await Promise.all(
      users.map(async (user) => {
        console.log(`🔍 Procesando notificación para usuario ${user.userId}`);

        // Buscar en el mapa local en lugar de hacer consulta
        const userNotifications = existingByUser.get(user.userId) || [];
        const exists = userNotifications.find(
          (notification) =>
            notification.metadata?.productId === metadata?.productId,
        );

        if (exists) {
          console.log(
            `♻️ Actualizando notificación existente para ${user.userId}`,
          );
          exists.message = message;
          exists.title = title;
          exists.read = false;
          exists.metadata = metadata;
          return this._notificationRepository.save(exists);
        }

        console.log(`🆕 Creando nueva notificación para ${user.userId}`);
        const newNotif = this._notificationRepository.create({
          user,
          type,
          title,
          message,
          metadata,
        });

        return this._notificationRepository.save(newNotif);
      }),
    );

    console.log(`✅ Notificaciones procesadas: ${notifs.length}`);
    return notifs.filter(Boolean);
  }

  async getNotificationsForUser(userId: string) {
    console.log(`📥 Obteniendo notificaciones para usuario ${userId}`);
    return this._notificationRepository.find({
      where: { user: { userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async markAllAsRead(userId: string) {
    console.log(`📘 Marcando todas como leídas para ${userId}`);
    await this._notificationRepository.update(
      { user: { userId } },
      { read: true },
    );
  }

  async deleteNotification(notificationId: string) {
    console.log(`🗑️ Eliminando notificación ${notificationId}`);
    await this._notificationRepository.delete(notificationId);
  }

  async deleteAllNotificationsForUser(userId: string) {
    console.log(`🗑️ Eliminando todas las notificaciones del usuario ${userId}`);
    await this._notificationRepository.delete({ user: { userId } });
  }

  async getNotificationsPaginated(
    userId: string,
    params: ParamsPaginationDto,
  ): Promise<ResponsePaginationDto<any>> {
    console.log(`📄 Obteniendo notificaciones paginadas para ${userId}`);
    const { page = 1, perPage = 10, order = 'DESC' } = params;

    const [data, total] = await this._notificationRepository.findAndCount({
      where: { user: { userId } },
      order: { createdAt: order },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    const pagination = new PageMetaDto({
      pageOptionsDto: params,
      itemCount: total,
    });

    console.log(`📄 Total de notificaciones encontradas: ${total}`);
    return new ResponsePaginationDto(data, pagination);
  }
}
