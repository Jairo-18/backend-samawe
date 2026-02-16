import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'AdditionalType' })
export class AdditionalType {
  @PrimaryGeneratedColumn()
  additionalTypeId: number;

  @Column('varchar', { length: 255, nullable: true })
  code?: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  value: number;

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
