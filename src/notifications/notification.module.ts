import { UserService } from './../user/services/user.service';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    SharedModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, UserService],
})
export class NotificationModule {}
