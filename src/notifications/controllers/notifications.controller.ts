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
import { NotificationsService } from '../services/notifications.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PaginatedNotificationParamsDto } from '../dtos/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
    return await this.notificationsService.getUserNotifications(userId, params);
  }

  @Get('unread-count')
  @ApiOperation({
    summary:
      'Obtener el contador global de notificaciones no leídas del usuario',
  })
  async getUnreadCount(@Request() req) {
    const userId = req.user.userId;
    const count = await this.notificationsService.getUnreadCount(userId);
    return {
      statusCode: 200,
      message: 'Contador obtenido',
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
    const result =
      await this.notificationsService.getInitialNotifications(userId);
    return {
      statusCode: 200,
      message: 'Carga inicial obtenida',
      data: result,
    };
  }

  @Patch('mark-all-read')
  @ApiOperation({
    summary: 'Marcar TODAS las notificaciones del usuario como leídas',
  })
  async markAllAsRead(@Request() req) {
    const userId = req.user.userId;
    const result = await this.notificationsService.markAllAsRead(userId);
    return {
      statusCode: 200,
      message: 'Notificaciones marcadas como leídas',
      data: result,
    };
  }

  @Patch('mark-all-unread')
  @ApiOperation({
    summary: 'Marcar TODAS las notificaciones del usuario como no leídas',
  })
  async markAllAsUnread(@Request() req) {
    const userId = req.user.userId;
    const result = await this.notificationsService.markAllAsUnread(userId);
    return {
      statusCode: 200,
      message: 'Notificaciones marcadas como no leídas',
      data: result,
    };
  }

  @Patch(':id/toggle-read')
  @ApiOperation({
    summary: 'Alternar entre leído y no leído para una notificación especifica',
  })
  async toggleRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    const notification = await this.notificationsService.toggleRead(id, userId);
    return {
      statusCode: 200,
      message: notification.read
        ? 'Notificación marcada como leída'
        : 'Notificación marcada como no leída',
      data: notification,
    };
  }

  @Delete('all')
  @ApiOperation({ summary: 'Eliminar TODAS las notificaciones del usuario' })
  async deleteAll(@Request() req) {
    const userId = req.user.userId;
    const result =
      await this.notificationsService.deleteAllNotifications(userId);
    return {
      statusCode: 200,
      message: 'Todas las notificaciones han sido eliminadas',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una notificación especifica' })
  async deleteNotification(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    const result = await this.notificationsService.deleteNotification(
      id,
      userId,
    );
    return {
      statusCode: 200,
      message: 'Notificación eliminada',
      data: result,
    };
  }
}
