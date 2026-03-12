import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Organizational } from './organizational.entity';

@Entity({ name: 'Recipe' })
export class Recipe {
  @PrimaryGeneratedColumn()
  recipeId: number;

  @ManyToOne(() => Product, { nullable: false, eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Product, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'ingredientProductId' })
  ingredient: Product;

  @Column('decimal', { precision: 10, scale: 3, nullable: false })
  quantity: number;

  @Column('varchar', { length: 500, nullable: true })
  notes?: string;

  @ManyToOne(() => Organizational, { nullable: true })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;

  @Column('uuid', { nullable: true })
  organizationalId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
