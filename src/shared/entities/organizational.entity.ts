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
import { CorporateValue } from './corporateValue.entity';

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

  @Column('varchar', { length: 20, nullable: true })
  tertiaryColor?: string;

  // Home
  @Column('varchar', { length: 200, nullable: true })
  homeTitle?: string;

  @Column('text', { nullable: true })
  homeDescription?: string;

  @Column('varchar', { length: 200, nullable: true })
  experienceTitle?: string;

  @Column('text', { nullable: true })
  experienceDescription?: string;

  @Column('varchar', { length: 200, nullable: true })
  reservationTitle?: string;

  @Column('text', { nullable: true })
  reservationDescription?: string;

  // About Us
  @Column('varchar', { length: 200, nullable: true })
  aboutUsTitle?: string;

  @Column('text', { nullable: true })
  aboutUsDescription?: string;

  @Column('varchar', { length: 200, nullable: true })
  missionTitle?: string;

  @Column('text', { nullable: true })
  missionDescription?: string;

  @Column('varchar', { length: 200, nullable: true })
  visionTitle?: string;

  @Column('text', { nullable: true })
  visionDescription?: string;

  @Column('varchar', { length: 200, nullable: true })
  historyTitle?: string;

  @Column('text', { nullable: true })
  historyDescription?: string;

  // Gastronomy
  @Column('varchar', { length: 200, nullable: true })
  gastronomyTitle?: string;

  @Column('text', { nullable: true })
  gastronomyDescription?: string;

  @Column('varchar', { length: 200, nullable: true })
  gastronomyHistoryTitle?: string;

  @Column('text', { nullable: true })
  gastronomyHistoryDescription?: string;

  @Column('varchar', { length: 200, nullable: true })
  gastronomyKitchenTitle?: string;

  @Column('text', { nullable: true })
  gastronomyKitchenDescription?: string;

  @Column('varchar', { length: 200, nullable: true })
  gastronomyIngredientsTitle?: string;

  @Column('text', { nullable: true })
  gastronomyIngredientsDescription?: string;

  // Accommodations
  @Column('varchar', { length: 200, nullable: true })
  accommodationsTitle?: string;

  @Column('text', { nullable: true })
  accommodationsDescription?: string;

  // How to Arrive
  @Column('text', { nullable: true })
  howToArrivePublicTransportDescription?: string;

  @Column('text', { nullable: true })
  howToArrivePrivateTransportDescription?: string;

  @Column('text', { nullable: true })
  accessibilityDescription?: string;

  @Column('varchar', { length: 500, nullable: true })
  mapsUrl?: string;

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

  @OneToMany(
    () => CorporateValue,
    (corporateValue) => corporateValue.organizational,
  )
  corporateValues: CorporateValue[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
