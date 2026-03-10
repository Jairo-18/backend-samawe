import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { Notification } from '../shared/entities/notification.entity';
import { PassportModule } from '@nestjs/passport';
import { NotificationUC } from './useCases/notificationUC.uc';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationUC],
  exports: [NotificationsService, NotificationUC],
})
export class NotificationsModule {}
