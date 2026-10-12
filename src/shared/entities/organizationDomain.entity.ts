import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organizational } from './organizational.entity';

/**
 * Para qué sirve el dominio:
 * - `web`: el sitio del hotel (canónica, sitemap, enlaces de correo, CORS).
 * - `api`: el host por el que su front llama a esta API (`api.<dominio>`).
 *   Es lo que resuelve el hotel cuando el front es de otro dominio.
 * - `staging`: pruebas (testfrontend, apidev, localhost en dev).
 */
export type OrganizationDomainKind = 'web' | 'api' | 'staging';

/** Solo `active` resuelve un hotel; el resto responde como host desconocido. */
export type OrganizationDomainStatus = 'pending' | 'active' | 'disabled';

/**
 * Qué hotel atiende cada host. Es la ÚNICA fuente de la organización de una
 * petición: un host que no está aquí (o no está activo) se rechaza, nunca cae
 * en "la primera organización".
 */
@Entity({ name: 'organization_domains' })
export class OrganizationDomain {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('uuid')
  organizationalId: string;

  @ManyToOne(() => Organizational, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationalId' })
  organizational?: Organizational;

  /** En minúsculas, sin puerto, sin punto final y sin `www.` (ver `normalizeHost`). */
  @Column('varchar', { length: 253, unique: true })
  hostname: string;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  /**
   * Host del PANEL de la plataforma (hoy la API de Samawe): con sesión, el
   * hotel de la petición es el del usuario (JWT), no el del host. Sin sesión
   * (web pública) sigue siendo el del host. Ver `checkSessionTenant`.
   */
  @Column({ type: 'boolean', default: false })
  isPanel: boolean;

  @Column('varchar', { length: 10, default: 'web' })
  kind: OrganizationDomainKind;

  @Column('varchar', { length: 12, default: 'pending' })
  status: OrganizationDomainStatus;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt?: Date;
}
