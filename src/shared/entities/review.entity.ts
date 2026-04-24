import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ReviewReply } from './reviewReply.entity';
import { Organizational } from './organizational.entity';

@Entity({ name: 'Review' })
export class Review {
  @PrimaryGeneratedColumn()
  reviewId: number;

  @Column('varchar', { length: 255, nullable: false })
  title: string;

  @Column('text', { nullable: false })
  comment: string;

  @Column('decimal', { precision: 2, scale: 1, nullable: false })
  score: number;

  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Organizational, { nullable: false, eager: false })
  @JoinColumn({ name: 'organizationalId' })
  organizational: Organizational;

  @OneToMany(() => ReviewReply, (reply) => reply.review, {
    cascade: true,
    eager: false,
  })
  replies: ReviewReply[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
