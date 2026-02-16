import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  LOW_PRODUCT = 'LOW_PRODUCT',
  ROOM_MAINTENANCE = 'ROOM_MAINTENANCE',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  notificationId: string;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ default: false })
  read: boolean;

  @ManyToOne(() => User, { nullable: true })
  user: User; // puede ser null si la notificación es general

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @CreateDateColumn()
  createdAt: Date;
}
