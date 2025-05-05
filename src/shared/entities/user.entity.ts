import { PhoneCode } from './phoneCode.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IdentificationType } from './identificationType.entity';
import { RoleType } from './roleType.entity';
import { Invoice } from './invoice.entity';

@Entity({ name: 'User' })
export class User {
  @PrimaryColumn('uuid')
  userId: string;

  @Column('varchar', {
    length: 50,
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
    length: 150,
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

  @ManyToOne(() => PhoneCode, (phoneCode) => phoneCode.user)
  @JoinColumn({ name: 'phoneCodeId' })
  phoneCode: PhoneCode;

  @ManyToOne(() => RoleType, (roleType) => roleType.user)
  @JoinColumn({ name: 'roleTypeId' })
  roleType: RoleType;

  @ManyToOne(
    () => IdentificationType,
    (identificationType) => identificationType.user,
  )
  @JoinColumn({ name: 'identificationTypeId' })
  identificationType: IdentificationType;

  @OneToMany(() => Invoice, (invoice) => invoice.user)
  invoices: Invoice[];

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
