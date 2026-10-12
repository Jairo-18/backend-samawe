import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Accommodation } from './accommodation.entity';
import { Organizational } from './organizational.entity';

/**
 * Tarifa de un hospedaje por tiempo de estadía: "4 horas -> $60.000".
 *
 * Samawe (hotel) tiene una sola, de 24 horas, igual al `priceSale` del
 * hospedaje. Un motel como Crazy Love tiene varias (4, 8, 12, 16, 20, 24 h).
 * La de 24 horas y `priceSale` se mantienen iguales (ver
 * `AccommodationService`): `priceSale` es el que usa la facturación.
 */
@Entity({ name: 'AccommodationRate' })
@Index('UQ_AccommodationRate_accommodation_hours', ['accommodation', 'hours'], { unique: true })
export class AccommodationRate {
  @PrimaryGeneratedColumn()
  accommodationRateId: number;

  /** Horas de estadía que cubre la tarifa. */
  @Column({ type: 'int' })
  hours: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Accommodation, (accommodation) => accommodation.rates, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accommodationId' })
  accommodation: Accommodation;

  @ManyToOne(() => Organizational, { nullable: true, eager: false })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt?: Date;
}
