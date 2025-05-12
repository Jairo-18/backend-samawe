import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'TaxeType' })
export class TaxeType {
  @PrimaryGeneratedColumn()
  taxeTypeId: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0.0 })
  name: number;

  @OneToMany(() => Product, (product) => product.taxeType, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  product: Product[];

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
