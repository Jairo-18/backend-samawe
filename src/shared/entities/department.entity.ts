import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Municipality } from './municipality.entity';

/**
 * Departamento de Colombia (catálogo DANE / DIVIPOLA).
 * El "code" es el código DANE de 2 dígitos (p. ej. "86" = Putumayo).
 * Catálogo estático sembrado por migración; por eso la PK es un entero fijo
 * (no autogenerado).
 */
@Entity({ name: 'Department' })
export class Department {
  @PrimaryColumn('int')
  departmentId: number;

  @Column('varchar', { length: 2, unique: true })
  code: string;

  @Column('varchar', { length: 120 })
  name: string;

  @OneToMany(() => Municipality, (municipality) => municipality.department)
  municipalities: Municipality[];
}
