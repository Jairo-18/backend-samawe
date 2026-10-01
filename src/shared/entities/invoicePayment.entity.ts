import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { PayType } from './payType.entity';
import { User } from './user.entity';

/**
 * Abono recibido contra una factura a crédito. Es control interno (cartera):
 * la DIAN no recibe cuándo ni cuánto se abonó, solo el vencimiento final.
 */
@Entity({ name: 'InvoicePayment' })
export class InvoicePayment {
  @PrimaryGeneratedColumn()
  invoicePaymentId: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  /** Con qué se pagó este abono (efectivo, transferencia...). */
  @ManyToOne(() => PayType, { nullable: true })
  @JoinColumn({ name: 'payTypeId' })
  payType?: PayType;

  /** Día en que se recibió el dinero (puede ser anterior a la fecha de registro). */
  @Column({ type: 'date' })
  paidAt: string;

  @Column('varchar', { length: 255, nullable: true })
  note?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'employeeId' })
  employee?: User;

  @CreateDateColumn()
  createdAt: Date;
}
