import { InvoiceProduct } from './invoiceProduct.entity';
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
import { TaxeType } from './taxeType.entity';

@Entity({ name: 'Product' })
export class Product {
  @PrimaryGeneratedColumn()
  productId: number;

  @Column('varchar', { length: 50, nullable: true })
  name: string;

  @Column('varchar', { length: 150, nullable: true })
  description?: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  amount?: number;

  @Column('decimal', { precision: 10, scale: 2 })
  priceBuy: number;

  @Column('decimal', { precision: 10, scale: 2 })
  priceSale: number;

  @ManyToOne(() => InvoiceProduct, (invoiceProduct) => invoiceProduct.product)
  @JoinColumn({ name: 'InvoiceProductId' })
  invoiceProduct: InvoiceProduct;

  @ManyToOne(() => TaxeType, (taxeType) => taxeType.product)
  @JoinColumn({ name: 'taxeTypeId' })
  taxeType: TaxeType;

  @ManyToOne(() => CategoryType, (categoryType) => categoryType.product)
  @JoinColumn({ name: 'categoryTypeId' })
  categoryType: CategoryType;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
