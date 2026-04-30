import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationUC } from '../useCases/notificationUC.uc';
import { PaginatedNotificationParamsDto } from '../dtos/notification.dto';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard(), RolesGuard)
@Roles(
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.EMP,
  RolesUser.MES,
  RolesUser.CHE,
  RolesUser.USER,
  RolesUser.PRO,
)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly _notificationUC: NotificationUC) {}

  @Get()
  @ApiOperation({
    summary:
      'Obtener todas las notificaciones del usuario logueado en sesión (paginadas)',
  })
  async getUserNotifications(
    @Request() req,
    @Query() params: PaginatedNotificationParamsDto,
  ) {
    const userId = req.user.userId;
    return await this._notificationUC.getUserNotifications(userId, params);
  }

  @Get('unread-count')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Obtener el contador global de notificaciones no leídas del usuario',
  })
  async getUnreadCount(@Request() req) {
    const userId = req.user.userId;
    const count = await this._notificationUC.getUnreadCount(userId);
    return {
      statusCode: 200,
      message: 'api.notifications.count',
      data: { count },
    };
  }

  @Get('initial')
  @ApiOperation({
    summary:
      'Obtener la carga inicial de notificaciones paginadas por cada estado',
  })
  async getInitialNotifications(@Request() req) {
    const userId = req.user.userId;
    const result = await this._notificationUC.getInitialNotifications(userId);
    return {
      statusCode: 200,
      message: 'api.notifications.initial',
      data: result,
    };
  }

  @Patch('mark-all-read')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Marcar TODAS las notificaciones del usuario como leídas',
  })
  async markAllAsRead(@Request() req) {
    const userId = req.user.userId;
    const result = await this._notificationUC.markAllAsRead(userId);
    return {
      statusCode: 200,
      message: 'api.notifications.marked_read',
      data: result,
    };
  }

  @Patch('mark-all-unread')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Marcar TODAS las notificaciones del usuario como no leídas',
  })
  async markAllAsUnread(@Request() req) {
    const userId = req.user.userId;
    const result = await this._notificationUC.markAllAsUnread(userId);
    return {
      statusCode: 200,
      message: 'api.notifications.marked_unread',
      data: result,
    };
  }

  @Patch(':id/toggle-read')
  @ApiOperation({
    summary: 'Alternar entre leído y no leído para una notificación especifica',
  })
  async toggleRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    const notification = await this._notificationUC.toggleRead(id, userId);
    return {
      statusCode: 200,
      message: notification.read
        ? 'api.notifications.toggled_read'
        : 'api.notifications.toggled_unread',
      data: notification,
    };
  }

  @Delete('all')
  @ApiOperation({ summary: 'Eliminar TODAS las notificaciones del usuario' })
  async deleteAll(@Request() req) {
    const userId = req.user.userId;
    const result = await this._notificationUC.deleteAllNotifications(userId);
    return {
      statusCode: 200,
      message: 'api.notifications.all_deleted',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una notificación especifica' })
  async deleteNotification(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    const result = await this._notificationUC.deleteNotification(id, userId);
    return {
      statusCode: 200,
      message: 'api.notifications.deleted',
      data: result,
    };
  }
}
