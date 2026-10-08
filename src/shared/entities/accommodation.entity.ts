import { AccommodationImage } from './accommodationImage.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { CategoryType } from './categoryType.entity';
import { BedType } from './bedType.entity';
import { StateType } from './stateType.entity';
import { Organizational } from './organizational.entity';
import { TaxeType } from './taxeType.entity';

@Entity({ name: 'Accommodation' })
export class Accommodation {
  @PrimaryGeneratedColumn()
  accommodationId: number;

  @Column('varchar', { length: 255, nullable: false })
  code?: string;

  @Column({ type: 'jsonb', nullable: false })
  name: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  description?: Record<string, string>;

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

  // ⚠️ El nombre de la columna es histórico: pese a "bathroom", NO es
  // cantidad de baños. El hotel lo usa como el aforo MÁXIMO del hospedaje
  // (contraparte de `amountPerson`, que es el mínimo). Renombrar la columna
  // es un cambio más grande (migración + todos los mappers/DTOs que la
  // tocan); por ahora se dejó documentado acá y en los DTOs.
  @Column({
    type: 'int',
    nullable: false,
  })
  amountBathroom?: number;

  @Column('decimal', { precision: 10, scale: 2 })
  priceBuy: number;

  @Column('decimal', { precision: 10, scale: 2 })
  priceSale: number;

  // Valor por noche de cada huésped por encima de `amountPerson` (las personas
  // incluidas en `priceSale`), con el mismo impuesto incluido. 0 = no cobra extra.
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  extraPersonPrice: number;

  @ManyToOne(() => StateType, (stateType) => stateType.accommodation)
  @JoinColumn({ name: 'stateTypeId' })
  stateType: StateType;

  @ManyToOne(() => BedType, (bedType) => bedType.accommodation)
  @JoinColumn({ name: 'bedTypeId' })
  bedType: BedType;

  @ManyToOne(() => CategoryType, (categoryType) => categoryType.accommodation)
  @JoinColumn({ name: 'categoryTypeId' })
  categoryType: CategoryType;

  @OneToMany(() => AccommodationImage, (image) => image.accommodation, {
    cascade: true,
    eager: true,
  })
  images: AccommodationImage[];

  @ManyToOne(() => TaxeType, { nullable: true, eager: false })
  @JoinColumn({ name: 'taxeTypeId' })
  taxeType?: TaxeType;

  @ManyToOne(() => Organizational, { nullable: true, eager: false })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
