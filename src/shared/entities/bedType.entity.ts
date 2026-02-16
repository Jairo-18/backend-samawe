import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Accommodation } from './accommodation.entity';

@Entity({ name: 'BedType' })
export class BedType {
  @PrimaryGeneratedColumn()
  bedTypeId: number;

  @Column('varchar', { length: 255, nullable: true })
  code?: string;

  @Column('varchar', { length: 255, nullable: true })
  name: string;

  @OneToMany(() => Accommodation, (accommodation) => accommodation.bedType, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  accommodation: Accommodation[];

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
