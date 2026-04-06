import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BenefitSection } from './benefitSection.entity';

@Entity({ name: 'BenefitItem' })
export class BenefitItem {
  @PrimaryGeneratedColumn('uuid')
  benefitItemId: string;

  @Column('varchar', { length: 150, nullable: false })
  name: string;

  @Column('varchar', { length: 100, nullable: false })
  icon: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(
    () => BenefitSection,
    (benefitSection) => benefitSection.items,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'benefitSectionId' })
  benefitSection: BenefitSection;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
