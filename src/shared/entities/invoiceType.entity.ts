import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'InvoiceType' })
export class InvoiceType {
  @PrimaryGeneratedColumn()
  invoiceTypeId: number;

  @Column('varchar', { length: 255, nullable: true })
  code?: string;

  @Column({ type: 'jsonb', nullable: true })
  name: Record<string, string>;

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
