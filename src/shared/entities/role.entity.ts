import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'Role' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  roleId: string;

  @Column('varchar', { length: 50 })
  name: string;

  @OneToMany(() => User, (user) => user.role, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User[];
}
