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

  @ManyToOne(() => Accommodation, (accommodation) => accommodation.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accommodationId' })
  accommodation: Accommodation;

  @ManyToOne(() => Organizational, { nullable: true, eager: false })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;
}
