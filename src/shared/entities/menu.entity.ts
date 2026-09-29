import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { Recipe } from './recipe.entity';
import { Product } from './product.entity';
import { Organizational } from './organizational.entity';

@Entity({ name: 'Menu' })
export class Menu {
  @PrimaryGeneratedColumn()
  menuId: number;

  @Column('jsonb', { nullable: false })
  name: Record<string, string>;

  @Column('jsonb', { nullable: true })
  description?: Record<string, string>;

  @ManyToMany(() => Recipe, { eager: true })
  @JoinTable({
    name: 'MenuRecipe',
    joinColumn: { name: 'menuId', referencedColumnName: 'menuId' },
    inverseJoinColumn: {
      name: 'recipeId',
      referencedColumnName: 'recipeId',
    },
  })
  recipes: Recipe[];

  /**
   * Productos normales (cualquier categoría) agregados a este menú sin pasar
   * por una receta — a diferencia de `recipes`, que exige que el producto
   * tenga `Recipe` asociada. `MenuService` decide en cuál de las dos cae
   * cada `productId` recibido.
   */
  @ManyToMany(() => Product, { eager: true })
  @JoinTable({
    name: 'MenuProduct',
    joinColumn: { name: 'menuId', referencedColumnName: 'menuId' },
    inverseJoinColumn: {
      name: 'productId',
      referencedColumnName: 'productId',
    },
  })
  products: Product[];

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
