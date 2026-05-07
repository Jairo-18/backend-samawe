import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationalMedia } from './organizationalMedia.entity';

@Entity({ name: 'MediaType' })
export class MediaType {
  @PrimaryGeneratedColumn()
  mediaTypeId: number;

  @Column('varchar', { length: 50, unique: true, nullable: false })
  code: string;

  @Column({ type: 'jsonb', nullable: true })
  name: Record<string, string>;

  @Column({ type: 'boolean', default: false })
  allowsMultiple: boolean;

  @Column({ type: 'int', nullable: true })
  maxItems: number;

  @OneToMany(
    () => OrganizationalMedia,
    (organizationalMedia) => organizationalMedia.mediaType,
  )
  organizationalMedias: OrganizationalMedia[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
