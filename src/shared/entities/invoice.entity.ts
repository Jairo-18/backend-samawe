import { User } from './user.entity';
import { InvoiceProduct } from './invoiceProduct.entity';
import { PayType } from './payType.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { CategoryType } from './categoryType.entity';

@Entity({ name: 'Invoice' })
export class Invoice {
  @PrimaryGeneratedColumn()
  invoiceId: number;

  @Column('varchar', { length: 50, nullable: true })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @ManyToOne(() => User, (user) => user.invoices)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => InvoiceProduct, (invoiceProduct) => invoiceProduct.invoice)
  @JoinColumn({ name: 'invoiceProductId' })
  invoiceProduct: InvoiceProduct;

  @ManyToOne(() => PayType, (payType) => payType.invoice)
  @JoinColumn({ name: 'payTipeId' })
  payType: PayType;

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
