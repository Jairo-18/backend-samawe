import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LegalItem } from './legalItem.entity';

@Entity({ name: 'LegalItemChild' })
export class LegalItemChild {
  @PrimaryGeneratedColumn('uuid')
  legalItemChildId: string;

  @Column('text', { nullable: false })
  content: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(
    () => LegalItem,
    (legalItem) => legalItem.children,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'legalItemId' })
  legalItem: LegalItem;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
