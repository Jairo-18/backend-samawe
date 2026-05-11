import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LegalSection } from './legalSection.entity';
import { LegalItemChild } from './legalItemChild.entity';

@Entity({ name: 'LegalItem' })
export class LegalItem {
  @PrimaryGeneratedColumn('uuid')
  legalItemId: string;

  @Column('jsonb', { nullable: true })
  title?: Record<string, string>;

  @Column('jsonb', { nullable: true })
  description?: Record<string, string>;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(
    () => LegalSection,
    (legalSection) => legalSection.items,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'legalSectionId' })
  legalSection: LegalSection;

  @OneToMany(() => LegalItemChild, (child) => child.legalItem, {
    cascade: true,
    eager: true,
  })
  children: LegalItemChild[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
