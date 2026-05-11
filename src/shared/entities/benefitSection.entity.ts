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
import { BenefitItem } from './benefitItem.entity';

@Entity({ name: 'BenefitSection' })
export class BenefitSection {
  @PrimaryGeneratedColumn('uuid')
  benefitSectionId: string;

  @Column('jsonb', { nullable: false })
  title: Record<string, string>;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(
    () => Organizational,
    (organizational) => organizational.benefitSections,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'organizationalId' })
  organizational: Organizational;

  @OneToMany(() => BenefitItem, (benefitItem) => benefitItem.benefitSection, {
    cascade: true,
    eager: true,
  })
  items: BenefitItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
