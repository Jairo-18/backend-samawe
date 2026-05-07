import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity({ name: 'TaxeType' })
export class TaxeType {
  @PrimaryGeneratedColumn()
  taxeTypeId: number;

  @Column({ type: 'jsonb', nullable: true })
  name: Record<string, string>;

  @Column('float', { nullable: false })
  percentage: number;

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
