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
import { Organizational } from './organizational.entity';
import { LegalItem } from './legalItem.entity';

@Entity({ name: 'LegalSection' })
export class LegalSection {
  @PrimaryGeneratedColumn('uuid')
  legalSectionId: string;

  @Column('varchar', { length: 20, nullable: false })
  type: string; // 'terms' | 'privacy'

  @ManyToOne(
    () => Organizational,
    (organizational) => organizational.legalSections,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'organizationalId' })
  organizational: Organizational;

  @OneToMany(() => LegalItem, (legalItem) => legalItem.legalSection, {
    cascade: true,
    eager: true,
  })
  items: LegalItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
