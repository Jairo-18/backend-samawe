import { Invoice } from './invoice.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'PayType' })
export class PayType {
  @PrimaryGeneratedColumn()
  payTypeId: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.payType)
  @JoinColumn({ name: 'invoicesId' })
  invoice: Invoice;

  @Column('varchar', { length: 50, nullable: true })
  name: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
