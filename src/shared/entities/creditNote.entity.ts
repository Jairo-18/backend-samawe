import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

/**
 * Nota crédito electrónica (Factus / DIAN) emitida sobre una factura electrónica
 * de venta. Una factura puede tener varias (devoluciones parciales). Sirve para
 * "restar" ítems/valores de la factura: parcial (concepto 1) o anulación total
 * (concepto 2).
 *
 * ⚠️ Este comentario decía que "la nota débito NO existe en Factus". Es FALSO:
 * existe (`POST /v2/debit-notes/validate`, conceptos 1–4 y rango propio). Ese
 * dato equivocado fue lo que la dejó fuera del alcance en junio de 2026 aunque
 * el contador la había pedido. Simplemente **no está implementada todavía**.
 */
@Entity({ name: 'CreditNote' })
export class CreditNote {
  @PrimaryGeneratedColumn()
  creditNoteId: number;

  @Column('integer')
  invoiceId: number;

  @ManyToOne(() => Invoice, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  /** Código único de la nota crédito en nuestro sistema (reference_code Factus). */
  @Column('varchar', { length: 255 })
  referenceCode: string;

  /** Concepto de corrección DIAN: '1' devolución parcial, '2' anulación total, … */
  @Column('varchar', { length: 5 })
  correctionConceptCode: string;

  /** true = anula la factura completa; false = devolución/resta parcial. */
  @Column('boolean', { default: false })
  isTotal: boolean;

  /** Número de la nota crédito devuelto por Factus (p. ej. NC1). */
  @Column('varchar', { length: 255, nullable: true })
  factusNumber?: string;

  /** CUDE de la nota crédito (análogo al CUFE de la factura). */
  @Column('varchar', { length: 255, nullable: true })
  factusCude?: string;

  @Column('text', { nullable: true })
  factusQrCode?: string;

  @Column('text', { nullable: true })
  factusPublicUrl?: string;

  @Column('numeric', { precision: 12, scale: 2, default: 0 })
  total: string;

  @Column('varchar', { length: 250, nullable: true })
  observation?: string;

  /** Snapshot de los ítems acreditados (lo que se envió a Factus). */
  @Column({ type: 'jsonb', nullable: true })
  itemsSnapshot?: unknown;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
