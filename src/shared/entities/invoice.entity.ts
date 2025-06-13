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

@Unique('UQ_invoice_code_per_type', ['code', 'invoiceType'])
@Entity({ name: 'Invoice' })
export class Invoice {
  @PrimaryGeneratedColumn()
  invoiceId: number;

  @Column('varchar', { length: 255, nullable: false })
  code: string;

  @ManyToOne(() => InvoiceType)
  @JoinColumn({ name: 'invoiceTypeId' })
  invoiceType: InvoiceType;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  @ManyToOne(() => PaidType)
  @JoinColumn({ name: 'paidTypeId' })
  paidType: PaidType;

  @ManyToOne(() => PayType)
  @JoinColumn({ name: 'payTypeId' })
  payType: PayType;

  @Column({ type: 'boolean', default: false })
  invoiceElectronic: boolean;

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
    nullable: false,
    default: 0,
  })
  total: number;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @OneToMany(() => InvoiceDetaill, (detail) => detail.invoice, {
    cascade: true,
  })
  invoiceDetails: InvoiceDetaill[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
