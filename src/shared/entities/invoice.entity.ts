import { User } from './user.entity';
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
  Unique,
} from 'typeorm';
import { PaidType } from './paidType.entity';
import { InvoiceDetaill } from './invoiceDetaill.entity';
import { InvoiceType } from './invoiceType.entity';
import { StateType } from './stateType.entity';
import { Organizational } from './organizational.entity';
import { InvoicePayment } from './invoicePayment.entity';

@Unique('UQ_invoice_code_per_type', ['code', 'invoiceType'])
@Entity({ name: 'Invoice' })
export class Invoice {
  @PrimaryGeneratedColumn()
  invoiceId: number;

  @Column('varchar', { length: 255, nullable: false })
  code: string;

  @Column('varchar', { length: 500, nullable: true })
  observations?: string;

  @ManyToOne(() => InvoiceType)
  @JoinColumn({ name: 'invoiceTypeId' })
  invoiceType: InvoiceType;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  @ManyToOne(() => PaidType, { nullable: true })
  @JoinColumn({ name: 'paidTypeId' })
  paidType?: PaidType;

  @ManyToOne(() => PayType, { nullable: true })
  @JoinColumn({ name: 'payTypeId' })
  payType?: PayType;

  @ManyToOne(() => StateType, { nullable: true })
  @JoinColumn({ name: 'stateTypeId' })
  stateType?: StateType;

  @Column('varchar', { length: 50, nullable: true })
  tableNumber?: string;

  @Column({ type: 'boolean', default: false })
  invoiceElectronic: boolean;

  @Column({ type: 'timestamp', nullable: true })
  orderTime?: Date;

  @Column({ type: 'timestamp', nullable: true })
  readyTime?: Date;

  @Column({ type: 'timestamp', nullable: true })
  servedTime?: Date;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  subtotalWithoutTax: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  subtotalWithTax: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  transfer: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  cash: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  total: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  paidTotal: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  totalVat: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  totalIco8: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  totalIco5: number;

  @Column({ type: 'date' })
  startDate: Date;

  // Crédito (payType CRE). `creditDays` = plazo total elegido (30, 60 o 90) y
  // `creditStartDate` el día desde el que corre. El plan de cuotas NO se guarda:
  // se deriva (una cuota cada 30 días, ver InvoiceCreditService) para que no se
  // desfase si cambia el total. `dueDate` es el vencimiento FINAL y es lo único
  // que viaja a la DIAN (`payment_details[].due_date`).
  @Column({ type: 'smallint', nullable: true })
  creditDays?: number | null;

  @Column({ type: 'date', nullable: true })
  creditStartDate?: string | null;

  @Column({ type: 'date', nullable: true })
  dueDate?: string | null;

  @OneToMany(() => InvoicePayment, (payment) => payment.invoice)
  payments?: InvoicePayment[];

  @Column({ type: 'date' })
  endDate: Date;

  @OneToMany(() => InvoiceDetaill, (detail) => detail.invoice, {
    cascade: true,
  })
  invoiceDetails: InvoiceDetaill[];

  @ManyToOne(() => Organizational, { nullable: true, eager: false })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;

  // Factus (facturación electrónica) result fields

  // El reference_code real enviado a Factus. Normalmente coincide con invoice.code,
  // pero cuando hay reintentos por 409/Regla-90 se añade un sufijo (-v2, -v3…) para
  // evitar el rechazo por "documento procesado anteriormente". Se guarda para poder
  // referenciar la factura en Factus y en notas crédito.
  @Column('varchar', { length: 80, nullable: true })
  factusReferenceCode?: string;

  @Column('varchar', { length: 50, nullable: true })
  factusNumber?: string;

  @Column('text', { nullable: true })
  factusCufe?: string;

  @Column('text', { nullable: true })
  factusQrCode?: string;

  @Column('text', { nullable: true })
  factusPublicUrl?: string;

  @Column({ type: 'timestamp', nullable: true })
  factusSentAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
