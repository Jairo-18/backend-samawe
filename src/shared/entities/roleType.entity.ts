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

@Entity({ name: 'RoleType' })
export class RoleType {
  @PrimaryGeneratedColumn('uuid')
  roleTypeId: string;

  @Column('varchar', { length: 255, nullable: true })
  code: string;

  @Column('varchar', { length: 255, nullable: true })
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

  @OneToMany(() => User, (user) => user.roleType)
  user: User[];
}
