import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from './product.entity';
import { Accommodation } from './accommodation.entity';
import { Excursion } from './excursion.entity';

@Entity({ name: 'CategoryType' })
export class CategoryType {
  @PrimaryGeneratedColumn()
  categoryTypeId: number;

  @Column('varchar', { length: 255, nullable: true })
  code: string;

  @Column('varchar', { length: 255, nullable: true })
  name: string;

  @OneToMany(() => Product, (product) => product.categoryType, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  product: Product[];

  @OneToMany(
    () => Accommodation,
    (accommodation) => accommodation.categoryType,
    {
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  accommodation: Accommodation[];

  @OneToMany(() => Excursion, (excursion) => excursion.categoryType, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  excursion: Excursion[];

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
