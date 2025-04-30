import { AdditionalType } from './additionalType.entity';
import { AvailableType } from './availableType.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { CategoryType } from './categoryType.entity';
import { TaxeType } from './taxeType.entity';

@Entity({ name: 'Experience' })
export class Experience {
  @PrimaryGeneratedColumn()
  experienceId: number;

  @Column('varchar', { length: 50, nullable: true })
  name: string;

  @Column('varchar', { length: 150, nullable: true })
  description?: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  amountPerson?: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  amount?: number;

  @Column('decimal', { precision: 10, scale: 2 })
  priceSale: number;

  @Column({ type: 'date', nullable: true })
  checkInDate: Date;

  @Column({ type: 'date', nullable: true })
  checkOutDate: Date;

  @Column({ type: 'date', nullable: true })
  reservationDate: Date;

  @ManyToOne(
    () => AdditionalType,
    (additionalType) => additionalType.experience,
  )
  @JoinColumn({ name: 'additionalTypeId' })
  additionalType: AdditionalType;

  @ManyToOne(() => AvailableType, (availableType) => availableType.experience)
  @JoinColumn({ name: 'availableTypeId' })
  availableType: AvailableType;

  @ManyToOne(() => TaxeType, (taxeType) => taxeType.product)
  @JoinColumn({ name: 'taxeTypeId' })
  taxeType: TaxeType;

  @ManyToOne(() => CategoryType, (categoryType) => categoryType.product)
  @JoinColumn({ name: 'categoryTypeId' })
  categoryType: CategoryType;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
