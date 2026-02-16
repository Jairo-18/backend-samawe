import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository extends Repository<Notification> {
  constructor(dataSource: DataSource) {
    super(Notification, dataSource.createEntityManager());
  }
}
