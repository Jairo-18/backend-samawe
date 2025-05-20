import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  ManyToMany,
} from 'typeorm';
import { CategoryType } from './categoryType.entity';
import { BedType } from './bedType.entity';
import { StateType } from './stateType.entity';
import { Booking } from './booking.entity';

@Entity({ name: 'Accommodation' })
export class Accommodation {
  @PrimaryGeneratedColumn()
  accommodationId: number;

  @Column('varchar', { length: 255, nullable: false })
  code?: string;

  @Column('varchar', { length: 255, nullable: false })
  name: string;

  @Column('varchar', { length: 500, nullable: true })
  description?: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  amountPerson?: number;

  @Column({ type: 'boolean', nullable: false })
  jacuzzi: boolean = true;

  @Column({
    type: 'int',
    nullable: false,
  })
  amountRoom?: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  amountBathroom?: number;

  @Column('decimal', { precision: 10, scale: 2 })
  priceBuy: number;

  @Column('decimal', { precision: 10, scale: 2 })
  priceSale: number;

  @ManyToOne(() => StateType, (stateType) => stateType.accommodation)
  @JoinColumn({ name: 'stateTypeId' })
  stateType: StateType;

  @ManyToOne(() => BedType, (bedType) => bedType.accommodation)
  @JoinColumn({ name: 'bedTypeId' })
  bedType: BedType;

  @ManyToOne(() => CategoryType, (categoryType) => categoryType.accommodation)
  @JoinColumn({ name: 'categoryTypeId' })
  categoryType: CategoryType;

  @ManyToMany(() => Booking, (booking) => booking.accommodation)
  booking: Booking[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
