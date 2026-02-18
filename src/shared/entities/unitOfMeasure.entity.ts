import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'UnitOfMeasure' })
export class UnitOfMeasure {
  @PrimaryGeneratedColumn()
  unitOfMeasureId: number;

  @Column('varchar', { length: 50, nullable: false })
  code: string;

  @Column('varchar', { length: 255, nullable: false })
  name: string;

  @OneToMany(() => Product, (product) => product.unitOfMeasure)
  products: Product[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
