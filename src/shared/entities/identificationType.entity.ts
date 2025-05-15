import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'IdentificationType' })
export class IdentificationType {
  @PrimaryGeneratedColumn()
  identificationTypeId: string;

  @Column('varchar', { length: 75, nullable: true })
  name: string;

  @OneToMany(() => User, (user) => user.identificationType)
  user: User[];

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
