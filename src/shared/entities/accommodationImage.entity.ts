import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Accommodation } from './accommodation.entity';
import { Organizational } from './organizational.entity';

@Entity('AccommodationImage')
export class AccommodationImage {
  @PrimaryGeneratedColumn()
  accommodationImageId: number;

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255 })
  publicId: string;

  /** Orden manual en la galería (0 = primera / portada). Lo decide el usuario arrastrando. */
  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => Accommodation, (accommodation) => accommodation.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accommodationId' })
  accommodation: Accommodation;

  @ManyToOne(() => Organizational, { nullable: true, eager: false })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;
}
