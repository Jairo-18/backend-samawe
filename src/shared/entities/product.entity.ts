import { AvailableType } from './availableType.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { CategoryType } from './categoryType.entity';

@Entity({ name: 'Product' })
export class Product {
  @PrimaryGeneratedColumn()
  productId: number;

  @Column('varchar', { length: 100, nullable: true })
  name: string;

  @Column('varchar', { length: 100, nullable: true })
  description?: string;

  @Column('int', {
    nullable: false,
  })
  amount?: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0.0 })
  taxe: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @ManyToOne(() => CategoryType, (categoryType) => categoryType.product)
  @JoinColumn({ name: 'categoryTypeId' })
  categoryType: CategoryType;

  @ManyToOne(() => AvailableType, (availableType) => availableType.product)
  @JoinColumn({ name: 'availableTypeId' })
  availableType: AvailableType;
}
