import { Invoice } from './invoice.entity';
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
