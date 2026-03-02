import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../../shared/repositories/notification.repository';
import { Notification } from '../../shared/entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  /**
   * Obtener todas las notificaciones para un usuario específico buscando por user ID,
   * ordenadas cronológicamente por la más reciente
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user: { userId } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Alternar el estado leído/no leído de una notificación individual
   */
  async toggleRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { notificationId, user: { userId } },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notificación ${notificationId} no encontrada para el usuario.`,
      );
    }

    notification.read = !notification.read;
    return this.notificationRepository.save(notification);
  }

  /**
   * Marcar TODAS las notificaciones de un usuario como leídas
   */
  async markAllAsRead(userId: string): Promise<{ affected: number }> {
    const result = await this.notificationRepository.update(
      { user: { userId }, read: false },
      { read: true },
    );
    return { affected: result.affected || 0 };
  }

  /**
   * Marcar TODAS las notificaciones de un usuario como no leídas
   */
  async markAllAsUnread(userId: string): Promise<{ affected: number }> {
    const result = await this.notificationRepository.update(
      { user: { userId }, read: true },
      { read: false },
    );
    return { affected: result.affected || 0 };
  }

  /**
   * Eliminar una notificación específica de un usuario
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<{ deleted: boolean }> {
    const result = await this.notificationRepository.delete({
      notificationId,
      user: { userId },
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Notificación no encontrada o no pertenece al usuario.`,
      );
    }

    return { deleted: true };
  }

  /**
   * Eliminar todas las notificaciones de un usuario
   */
  async deleteAllNotifications(userId: string): Promise<{ affected: number }> {
    const result = await this.notificationRepository.delete({
      user: { userId },
    });
    return { affected: result.affected || 0 };
  }
}
