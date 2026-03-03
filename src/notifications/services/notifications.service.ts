import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../../shared/repositories/notification.repository';
import { Notification } from '../../shared/entities/notification.entity';
import { PageMetaDto } from '../../shared/dtos/pageMeta.dto';
import { ResponsePaginationDto } from '../../shared/dtos/pagination.dto';
import { PaginatedNotificationParamsDto } from '../dtos/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  /**
   * Obtener todas las notificaciones para un usuario específico buscando por user ID,
   * ordenadas cronológicamente por la más reciente con soporte para paginación y filtro por estado.
   */
  async getUserNotifications(
    userId: string,
    params: PaginatedNotificationParamsDto,
  ): Promise<ResponsePaginationDto<Notification>> {
    const skip = (params.page - 1) * params.perPage;
    let query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(params.perPage);

    if (params.stateCode) {
      query = query.andWhere(
        "notification.metadata->>'stateCode' = :stateCode",
        { stateCode: params.stateCode },
      );
    }

    const [notifications, itemCount] = await query.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(notifications, pageMetaDto);
  }

  /**
   * Obtener la carga inicial consolidada para las 5 pestañas de notificaciones
   */
  async getInitialNotifications(userId: string): Promise<{
    notifications: Record<string, ResponsePaginationDto<Notification>>;
    unreadCount: number;
  }> {
    const states = ['PEN', 'ENC', 'LIS', 'ENT', 'CAN'];
    const promises = states.map((stateCode) =>
      this.getUserNotifications(userId, {
        page: 1,
        perPage: 10,
        stateCode,
      } as PaginatedNotificationParamsDto),
    );

    const [results, unreadCount] = await Promise.all([
      Promise.all(promises),
      this.getUnreadCount(userId),
    ]);

    const consolidatedData: Record<
      string,
      ResponsePaginationDto<Notification>
    > = {};
    states.forEach((stateCode, index) => {
      consolidatedData[stateCode] = results[index];
    });

    return {
      notifications: consolidatedData,
      unreadCount,
    };
  }

  /**
   * Obtener el conteo global de notificaciones no leídas de un usuario
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { user: { userId }, read: false },
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
