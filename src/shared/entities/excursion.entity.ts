import { ExcursionImage } from './escursionImage.entity';
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
import { StateType } from './stateType.entity';
import { Organizational } from './organizational.entity';

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

  @ManyToOne(() => StateType, (stateType) => stateType.excursion)
  @JoinColumn({ name: 'stateTypeId' })
  stateType: StateType;

  @ManyToOne(() => CategoryType, (categoryType) => categoryType.excursion)
  @JoinColumn({ name: 'categoryTypeId' })
  categoryType: CategoryType;

  @OneToMany(() => ExcursionImage, (image) => image.excursion, {
    cascade: true,
    eager: true,
  })
  images: ExcursionImage[];

  @ManyToOne(() => Organizational, { nullable: true, eager: false })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;

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
