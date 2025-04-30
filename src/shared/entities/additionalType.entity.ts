import { Experience } from './experience.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'AdditionalType' })
export class AdditionalType {
  @PrimaryGeneratedColumn()
  additionalTypeId: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  amountAdditional?: number;

  @OneToMany(() => Experience, (experience) => experience.additionalType, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  experience: Experience[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
