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
import { StateType } from './stateType.entity';
import { Booking } from './booking.entity';

@Entity({ name: 'Excursion' })
export class Excursion {
  @PrimaryGeneratedColumn()
  excursionId: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  code?: number;

  @Column('varchar', { length: 50, nullable: false })
  name: string;

  @Column('varchar', { length: 250, nullable: true })
  description?: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  amountPerson?: number;

  @Column('decimal', { precision: 10, scale: 2 })
  priceBuy: number;

  @Column('decimal', { precision: 10, scale: 2 })
  priceSale: number;

  @ManyToMany(() => Booking, (booking) => booking.excursion)
  booking: Booking[];

  @ManyToOne(() => StateType, (stateType) => stateType.excursion)
  @JoinColumn({ name: 'stateTypeId' })
  stateType: StateType;

  @ManyToOne(() => CategoryType, (categoryType) => categoryType.excursion)
  @JoinColumn({ name: 'categoryTypeId' })
  categoryType: CategoryType;

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
