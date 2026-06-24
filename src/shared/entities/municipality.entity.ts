import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Department } from './department.entity';

/**
 * Municipio de Colombia (catálogo DANE / DIVIPOLA).
 * El "code" es el código DANE de 5 dígitos: es justo el `municipality_code`
 * que espera Factus (DIAN) para el receptor de la factura electrónica. Sus 2
 * primeros dígitos corresponden al departamento.
 * Catálogo estático sembrado por migración; PK entera fija (no autogenerada).
 */
@Entity({ name: 'Municipality' })
export class Municipality {
  @PrimaryColumn('int')
  municipalityId: number;

  @Column('varchar', { length: 5, unique: true })
  code: string;

  @Column('varchar', { length: 120 })
  name: string;

  // FK expuesta como columna (además de la relación) para poder filtrar los
  // municipios por departamento desde el catálogo genérico sin cargar la relación.
  @Column('int')
  departmentId: number;

  @ManyToOne(() => Department, (department) => department.municipalities)
  @JoinColumn({ name: 'departmentId' })
  department: Department;
}
