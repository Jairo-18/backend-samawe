import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las notificaciones del usuario logueado en sesión',
  })
  async getUserNotifications(@Request() req) {
    const userId = req.user.userId;
    const items = await this.notificationsService.getUserNotifications(userId);
    return {
      statusCode: 200,
      message: 'Notificaciones obtenidas',
      data: items,
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
