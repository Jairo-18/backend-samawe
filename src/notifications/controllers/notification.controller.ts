import { User } from 'src/shared/entities/user.entity';
import { GetUser } from './../../shared/decorators/user.decorator';
import { NotificationService } from './../services/notification.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ParamsPaginationDto } from 'src/shared/dtos/pagination.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
@ApiTags('Notificaciones')
export class NotificationController {
  constructor(private readonly _notificationService: NotificationService) {}

  @Get('paginated')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async getPaginated(
    @GetUser() user: User,
    @Query() query: ParamsPaginationDto,
  ) {
    return this._notificationService.getNotificationsPaginated(
      user.userId,
      query,
    );
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async getAll(@GetUser() user: User) {
    return this._notificationService.getNotificationsForUser(user.userId);
  }

  @Delete(':notificationId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @HttpCode(204)
  async delete(@Param('notificationId') notificationId: string) {
    await this._notificationService.deleteNotification(notificationId);
  }

  @Delete()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @HttpCode(204)
  async deleteAll(@GetUser() user: User) {
    await this._notificationService.deleteAllNotificationsForUser(user.userId);
  }

  @Get('mark-all-read')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @HttpCode(204)
  async markAllAsRead(@GetUser() user: User) {
    await this._notificationService.markAllAsRead(user.userId);
  }

  @Get('run')
  @HttpCode(200)
  async runCronJobs(@Query('cronToken') cronToken: string) {
    if (cronToken !== process.env.CRON_TOKEN) {
      throw new UnauthorizedException('Invalid cron token');
    }

    const expired =
      await this._notificationService.updateExpiredAccommodations();
    const lowStock = await this._notificationService.checkLowStockProducts();

    return {
      message: 'Tareas ejecutadas correctamente',
      expiredRooms: expired,
      lowStockCount: lowStock,
    };
  }
}
