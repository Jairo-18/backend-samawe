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

@Entity()
export class PhoneCode {
  @PrimaryGeneratedColumn()
  phoneCodeId: string;

  @Column({ unique: true })
  code: string;

  @Column('varchar', { length: 50, nullable: true })
  name: string;

  @OneToMany(() => User, (user) => user.phoneCode, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
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
