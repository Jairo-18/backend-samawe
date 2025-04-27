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

@Entity({ name: 'Role' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  roleId: string;

  @Column('varchar', { length: 50 })
  name: string;

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

  @OneToMany(() => User, (user) => user.role, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User[];
}
