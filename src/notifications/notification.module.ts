import { UserModule } from './../user/user.module';
import { NotificationController } from './controllers/notification.controller';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { NotificationService } from './services/notification.service';

@Module({
  imports: [
    SharedModule.forRoot(),
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
