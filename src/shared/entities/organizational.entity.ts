import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IdentificationType } from './identificationType.entity';
import { PersonType } from './personType.entity';
import { PhoneCode } from './phoneCode.entity';
import { OrganizationalMedia } from './organizationalMedia.entity';

@Entity({ name: 'Organizational' })
export class Organizational {
  @PrimaryGeneratedColumn('uuid')
  organizationalId: string;

  @Column('varchar', { length: 150, nullable: false })
  name: string;

  @Column('varchar', { length: 150, nullable: true })
  legalName?: string;

  @Column('varchar', { length: 100, unique: true, nullable: false })
  slug: string;

  @Column('varchar', { length: 50, nullable: true })
  identificationNumber?: string;

  @Column('varchar', { length: 150, nullable: true })
  email?: string;

  @Column('varchar', { length: 25, nullable: true })
  phone?: string;

  @Column('varchar', { length: 200, nullable: true })
  website?: string;

  @Column('varchar', { length: 200, nullable: true })
  address?: string;

  @Column('varchar', { length: 100, nullable: true })
  city?: string;

  @Column('varchar', { length: 100, nullable: true })
  department?: string;

  @Column('varchar', { length: 100, nullable: true })
  timezone?: string;

  @Column('varchar', { length: 10, nullable: true })
  languageDefault?: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 20, nullable: true })
  primaryColor?: string;

  @Column('varchar', { length: 20, nullable: true })
  secondaryColor?: string;

  @Column('varchar', { length: 200, nullable: true })
  metaTitle?: string;

  @Column('varchar', { length: 500, nullable: true })
  metaDescription?: string;

  @Column({ type: 'boolean', default: false })
  paymentEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @ManyToOne(
    () => IdentificationType,
    (identificationType) => identificationType.user,
  )
  @JoinColumn({ name: 'identificationTypeId' })
  identificationType?: IdentificationType;

  @ManyToOne(() => PersonType, (personType) => personType.user)
  @JoinColumn({ name: 'personTypeId' })
  personType?: PersonType;

  @ManyToOne(() => PhoneCode, (phoneCode) => phoneCode.user)
  @JoinColumn({ name: 'phoneCodeId' })
  phoneCode?: PhoneCode;

  @OneToMany(
    () => OrganizationalMedia,
    (organizationalMedia) => organizationalMedia.organizational,
  )
  medias: OrganizationalMedia[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
