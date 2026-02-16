import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity({ name: 'Ingredient' })
export class Ingredient {
  @PrimaryGeneratedColumn()
  ingredientId: number;

  @Column('varchar', { length: 255, nullable: false })
  name: string;

  @Column('varchar', { length: 500, nullable: true })
  description?: string;

  @Column('varchar', { length: 50, nullable: false })
  unit: string;

  @Column('decimal', { precision: 10, scale: 3, default: 0 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 3, default: 0 })
  minStock: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Recipe, (recipe) => recipe.ingredient, { cascade: true })
  recipes: Recipe[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
