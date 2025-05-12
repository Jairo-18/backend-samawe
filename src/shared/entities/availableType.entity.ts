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

@Entity({ name: 'AvailableType' })
export class AvailableType {
  @PrimaryGeneratedColumn()
  availableTypeId: number;

  @Column('varchar', { length: 50, nullable: true })
  name: string;

  @OneToMany(() => Experience, (experience) => experience.availableType, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  experience: Experience[];

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
