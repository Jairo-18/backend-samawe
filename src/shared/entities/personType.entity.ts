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

@Entity({ name: 'PersonType' })
export class PersonType {
  @PrimaryGeneratedColumn()
  personTypeId: number;

  @Column('varchar', { length: 255, nullable: true })
  code: string;

  @Column({ type: 'jsonb', nullable: true })
  name: Record<string, string>;

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

  @OneToMany(() => User, (user) => user.personType)
  user: User[];
}
