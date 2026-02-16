import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Excursion } from './excursion.entity';

@Entity('ExcursionImage')
export class ExcursionImage {
  @PrimaryGeneratedColumn()
  excursionImageId: number;

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255 })
  publicId: string;

  @ManyToOne(() => Excursion, (excursion) => excursion.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'excursionId' })
  excursion: Excursion;
}
