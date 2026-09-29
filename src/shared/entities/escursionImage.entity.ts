import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Excursion } from './excursion.entity';
import { Organizational } from './organizational.entity';

@Entity('ExcursionImage')
export class ExcursionImage {
  @PrimaryGeneratedColumn()
  excursionImageId: number;

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255 })
  publicId: string;

  /** Orden manual en la galería (0 = primera / portada). Lo decide el usuario arrastrando. */
  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => Excursion, (excursion) => excursion.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'excursionId' })
  excursion: Excursion;

  @ManyToOne(() => Organizational, { nullable: true, eager: false })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;
}
