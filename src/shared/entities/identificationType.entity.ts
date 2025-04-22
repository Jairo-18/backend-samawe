import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'identificationType' })
export class identificationType {
  @PrimaryGeneratedColumn('uuid')
  identificationTypeId: string;

  @Column()
  name: string;

  @OneToMany(() => User, (user) => user.identificationType, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User[];
}
