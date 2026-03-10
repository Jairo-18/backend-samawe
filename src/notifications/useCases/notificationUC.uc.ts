import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { PaginatedNotificationParamsDto } from '../dtos/notification.dto';
import { Notification } from '../../shared/entities/notification.entity';
import { ResponsePaginationDto } from '../../shared/dtos/pagination.dto';

@Injectable()
export class NotificationUC {
  constructor(private readonly _notificationsService: NotificationsService) {}

  async getUserNotifications(
    userId: string,
    params: PaginatedNotificationParamsDto,
  ): Promise<ResponsePaginationDto<Notification>> {
    return await this._notificationsService.getUserNotifications(
      userId,
      params,
    );
  }

  async getInitialNotifications(userId: string) {
    return await this._notificationsService.getInitialNotifications(userId);
  }

  async getUnreadCount(userId: string) {
    return await this._notificationsService.getUnreadCount(userId);
  }

  async markAllAsRead(userId: string) {
    return await this._notificationsService.markAllAsRead(userId);
  }

  async markAllAsUnread(userId: string) {
    return await this._notificationsService.markAllAsUnread(userId);
  }

  async toggleRead(notificationId: string, userId: string) {
    return await this._notificationsService.toggleRead(notificationId, userId);
  }

  async deleteNotification(notificationId: string, userId: string) {
    return await this._notificationsService.deleteNotification(
      notificationId,
      userId,
    );
  }

  async deleteAllNotifications(userId: string) {
    return await this._notificationsService.deleteAllNotifications(userId);
  }
}
