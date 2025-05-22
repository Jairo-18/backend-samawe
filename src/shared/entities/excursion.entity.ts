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

  @Column('varchar', { length: 255, nullable: false })
  code?: string;

  @Column('varchar', { length: 255, nullable: false })
  name: string;

  @Column('varchar', { length: 500, nullable: true })
  description?: string;

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
