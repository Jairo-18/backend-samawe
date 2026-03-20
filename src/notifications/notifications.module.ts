import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './controllers/notifications.controller';
import { PushSubscriptionController } from './controllers/push-subscription.controller';
import { NotificationsService } from './services/notifications.service';
import { WebPushService } from './services/web-push.service';
import { Notification } from '../shared/entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { PassportModule } from '@nestjs/passport';
import { NotificationUC } from './useCases/notificationUC.uc';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, PushSubscription]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [NotificationsController, PushSubscriptionController],
  providers: [NotificationsService, NotificationUC, WebPushService],
  exports: [NotificationsService, NotificationUC, WebPushService],
})
export class NotificationsModule {}
