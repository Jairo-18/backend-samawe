import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Organizational } from './organizational.entity';

@Entity('ProductImage')
export class ProductImage {
  @PrimaryGeneratedColumn()
  productImageId: number;

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255 })
  publicId: string;

  /** Orden manual en la galería (0 = primera / portada). Lo decide el usuario arrastrando. */
  @Column({ type: 'int', default: 0 })
  position: number;

  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Organizational, { nullable: true, eager: false })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;
}
