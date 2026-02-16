import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity({ name: 'TaxeType' })
export class TaxeType {
  @PrimaryGeneratedColumn()
  taxeTypeId: number;

  @Column('varchar', { length: 255, nullable: false })
  name: string;

  @Column('float', { nullable: false })
  percentage: number;

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
