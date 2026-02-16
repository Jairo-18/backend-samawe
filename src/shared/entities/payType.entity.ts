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

  @Column('varchar', { length: 255, nullable: true })
  code?: string;

  @Column('varchar', { length: 255, nullable: true })
  name: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.payType)
  @JoinColumn({ name: 'invoicesId' })
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
