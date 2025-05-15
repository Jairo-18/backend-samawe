import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Accommodation } from './accommodation.entity';
import { Excursion } from './excursion.entity';

@Entity({ name: 'Booking' })
export class Booking {
  @PrimaryGeneratedColumn()
  bookingId: number;

  @ManyToOne(() => User, (user) => user.bookings)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToMany(() => Accommodation)
  @JoinTable({
    name: 'booking_accommodation',
    joinColumn: { name: 'bookingId', referencedColumnName: 'bookingId' },
    inverseJoinColumn: {
      name: 'accommodationId',
      referencedColumnName: 'accommodationId',
    },
  })
  accommodation: Accommodation[];

  @ManyToMany(() => Excursion)
  @JoinTable({
    name: 'booking_excursion',
    joinColumn: { name: 'bookingId', referencedColumnName: 'bookingId' },
    inverseJoinColumn: {
      name: 'excursionId',
      referencedColumnName: 'excursionId',
    },
  })
  excursion: Excursion[];

  @Column({ type: 'timestamp', nullable: false })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: false })
  exitDate: Date;

  @Column({ type: 'boolean', nullable: false })
  reservationOrDirect: boolean = true;

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt?: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: true,
  })
  updatedAt?: Date;

  @DeleteDateColumn({
    type: 'timestamp',
    nullable: true,
  })
  deletedAt?: Date;
}
