import { Invoice } from './invoice.entity';
import { Product } from './product.entity';
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

@Entity({ name: 'InvoiceDetaill' })
export class InvoiceDetaill {
  @PrimaryGeneratedColumn()
  invoiceDetaillId: number;

  @Column({ type: 'int', nullable: false })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceSale: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.invoiceDetaill)
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @ManyToOne(() => Product, (product) => product.invoiceDetaill)
  @JoinColumn({ name: 'productId' })
  product: Product;

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
