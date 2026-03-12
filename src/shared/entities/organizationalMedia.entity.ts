import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organizational } from './organizational.entity';
import { MediaType } from './mediaType.entity';

@Entity({ name: 'OrganizationalMedia' })
export class OrganizationalMedia {
  @PrimaryGeneratedColumn('uuid')
  organizationalMediaId: string;

  @Column('varchar', { length: 500, nullable: false })
  url: string;

  @Column('varchar', { length: 255, nullable: true })
  publicId: string;

  @Column('varchar', { length: 100, nullable: true })
  label?: string;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Organizational, (organizational) => organizational.medias, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationalId' })
  organizational: Organizational;

  @ManyToOne(() => MediaType, (mediaType) => mediaType.organizationalMedias)
  @JoinColumn({ name: 'mediaTypeId' })
  mediaType: MediaType;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;
}
