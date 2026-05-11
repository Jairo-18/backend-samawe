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
import { BenefitSection } from './benefitSection.entity';
import { LegalSection } from './legalSection.entity';

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

  @Column({ type: 'jsonb', nullable: true })
  description?: Record<string, string>;

  @Column('varchar', { length: 20, nullable: true })
  primaryColor?: string;

  @Column('varchar', { length: 20, nullable: true })
  secondaryColor?: string;

  @Column('varchar', { length: 20, nullable: true })
  tertiaryColor?: string;

  @Column('varchar', { length: 20, nullable: true })
  textColor?: string;

  @Column('varchar', { length: 20, nullable: true })
  titleColor?: string;

  @Column('varchar', { length: 20, nullable: true })
  subtitleColor?: string;

  @Column('varchar', { length: 20, nullable: true })
  bgPrimaryColor?: string;

  @Column('varchar', { length: 20, nullable: true })
  bgSecondaryColor?: string;

  @Column({ type: 'jsonb', nullable: true })
  homeTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  homeDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  experienceTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  experienceDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  reservationTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  reservationDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  aboutUsTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  aboutUsDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  missionTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  missionDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  visionTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  visionDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  historyTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  historyDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  gastronomyTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  gastronomyDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  gastronomyHistoryTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  gastronomyHistoryDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  gastronomyKitchenTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  gastronomyKitchenDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  gastronomyIngredientsTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  gastronomyIngredientsDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  accommodationsTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  accommodationsDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  howToArriveDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  howToArrivePublicTransportDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  howToArrivePrivateTransportDescription?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  accessibilityDescription?: Record<string, string>;

  @Column('varchar', { length: 500, nullable: true })
  mapsUrl?: string;

  @Column('varchar', { length: 500, nullable: true })
  videoUrl?: string;

  @Column('varchar', { length: 500, nullable: true })
  facebookUrl?: string;

  @Column('varchar', { length: 500, nullable: true })
  instagramUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  metaTitle?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  metaDescription?: Record<string, string>;

  @Column('text', { nullable: true })
  googleBusinessRefreshToken?: string;

  @Column('varchar', { length: 200, nullable: true })
  googleBusinessAccountName?: string;

  @Column('varchar', { length: 200, nullable: true })
  googleBusinessLocationName?: string;

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

  @OneToMany(
    () => BenefitSection,
    (benefitSection) => benefitSection.organizational,
  )
  benefitSections: BenefitSection[];

  @OneToMany(
    () => LegalSection,
    (legalSection) => legalSection.organizational,
  )
  legalSections: LegalSection[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
