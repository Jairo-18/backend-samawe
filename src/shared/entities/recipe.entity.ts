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
import { Ingredient } from './ingredient.entity';

@Entity({ name: 'Recipe' })
export class Recipe {
  @PrimaryGeneratedColumn()
  recipeId: number;

  @ManyToOne(() => Product, { nullable: false, eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Ingredient, (ingredient) => ingredient.recipes, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'ingredientId' })
  ingredient: Ingredient;

  @Column('decimal', { precision: 10, scale: 3, nullable: false })
  quantity: number;

  @Column('varchar', { length: 500, nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
