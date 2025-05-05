import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class PhoneCode {
  @PrimaryGeneratedColumn('uuid')
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
}
