import { PhoneCode } from './phoneCode.entity';
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
import { Exclude } from 'class-transformer';
import { IdentificationType } from './identificationType.entity';
import { RoleType } from './roleType.entity';
import { Invoice } from './invoice.entity';
import { PersonType } from './personType.entity';
import { Organizational } from './organizational.entity';
import { Department } from './department.entity';
import { Municipality } from './municipality.entity';

@Entity({ name: 'User' })
export class User {
  @PrimaryGeneratedColumn('uuid')
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
    nullable: true,
  })
  email: string;

  @Column('varchar', { length: 255, nullable: true })
  address?: string;

  // Ubicación (catálogo DANE). Solo aplica a clientes en Colombia; para
  // extranjeros queda en null (se factura con el municipio del negocio).
  // Las FKs se exponen como columnas (además de la relación) para poder
  // asignarlas/limpiarlas directamente en create/update.
  @Column('int', { nullable: true })
  departmentId?: number | null;

  @ManyToOne(() => Department, { nullable: true, eager: false })
  @JoinColumn({ name: 'departmentId' })
  department?: Department;

  @Column('int', { nullable: true })
  municipalityId?: number | null;

  @ManyToOne(() => Municipality, { nullable: true, eager: false })
  @JoinColumn({ name: 'municipalityId' })
  municipality?: Municipality;

  @Column('varchar', {
    length: 25,
    nullable: false,
  })
  phone: string;

  @Exclude()
  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  password: string;

  @Exclude()
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  googleId?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string;

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

  @ManyToOne(() => PersonType, (personType) => personType.user)
  @JoinColumn({ name: 'personTypeId' })
  personType: PersonType;

  @OneToMany(() => Invoice, (invoice) => invoice.user)
  invoices: Invoice[];

  @ManyToOne(() => Organizational, { nullable: true, eager: false })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;

  @Exclude()
  @Column({ type: 'varchar', length: 200, nullable: true })
  resetToken?: string;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry?: Date;

  @Exclude()
  @Column({ type: 'varchar', length: 200, nullable: true })
  emailVerificationToken?: string;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  emailVerificationTokenExpiry?: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isBanned: boolean;

  // Factus (facturación electrónica) — datos del cliente como receptor
  @Column('varchar', { length: 10, nullable: true })
  factusMunicipalityCode?: string;

  @Column('varchar', { length: 2, nullable: true })
  factusDv?: string;

  @Column('varchar', { length: 10, nullable: true, default: 'ZZ' })
  factusTributeCode?: string;

  @Column('varchar', { length: 2, nullable: true, default: '2' })
  factusLegalOrganizationCode?: string;

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
