import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organizational } from './organizational.entity';

@Entity({ name: 'CorporateValue' })
export class CorporateValue {
  @PrimaryGeneratedColumn('uuid')
  corporateValueId: string;

  @Column('varchar', { length: 150, nullable: false })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column('varchar', { length: 500, nullable: true })
  imageUrl?: string;

  @Column('varchar', { length: 300, nullable: true })
  imagePublicId?: string;

  @ManyToOne(
    () => Organizational,
    (organizational) => organizational.corporateValues,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'organizationalId' })
  organizational: Organizational;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
