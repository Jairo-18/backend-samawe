import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { identificationType } from './identificationType.entity';
import { Role } from './role.entity';

@Entity({ name: 'User' })
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar', {
    length: 25,
    nullable: false,
  })
  identificationNumber: string;

  @Column('varchar', {
    length: 50,
    nullable: false,
  })
  firstName: string;

  @Column('varchar', {
    length: 50,
    nullable: false,
  })
  lastName: string;

  @Column('varchar', {
    length: 255,
    nullable: false,
  })
  email: string;

  @Column('varchar', {
    length: 25,
    nullable: false,
  })
  phone: string;

  @Column('varchar', {
    length: 255,
    nullable: false,
  })
  password: string;

  @ManyToOne(() => Role, (role) => role.user)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(
    () => identificationType,
    (identificationType) => identificationType.user,
  )
  @JoinColumn({ name: 'identificationTypeId' })
  identificationType: identificationType;

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt?: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: true,
  })
  updatedAt?: Date;
}
