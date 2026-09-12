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
 * Nota débito electrónica (Factus / DIAN) emitida sobre una factura electrónica
 * de venta. Es la simétrica de la nota crédito: en vez de restar, **suma**.
 *
 * Dos diferencias que no son cosméticas:
 *
 *  - **No hay concepto de anulación.** Los conceptos son `1` intereses,
 *    `2` gastos por cobrar, `3` cambio del valor y `4` otros. Por eso aquí no
 *    existe el `isTotal` que sí tiene la nota crédito: una nota débito nunca
 *    anula una factura.
 *  - **No revierte inventario.** No devuelve mercancía, cobra de más. Esa
 *    ausencia es deliberada: replicar aquí el `reverseInventory` de la nota
 *    crédito descuadraría el stock en sentido contrario.
 */
@Entity({ name: 'DebitNote' })
export class DebitNote {
  @PrimaryGeneratedColumn()
  debitNoteId: number;

  @Column('integer')
  invoiceId: number;

  @ManyToOne(() => Invoice, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  /** Código único de la nota débito en nuestro sistema (reference_code Factus). */
  @Column('varchar', { length: 255 })
  referenceCode: string;

  /** Concepto DIAN: '1' intereses, '2' gastos por cobrar, '3' cambio del valor, '4' otros. */
  @Column('varchar', { length: 5 })
  correctionConceptCode: string;

  /** Número de la nota débito devuelto por Factus (p. ej. ND1). */
  @Column('varchar', { length: 255, nullable: true })
  factusNumber?: string;

  /** CUDE de la nota débito (análogo al CUFE de la factura). */
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

  /** Snapshot de los conceptos cobrados (lo que se envió a Factus). */
  @Column({ type: 'jsonb', nullable: true })
  itemsSnapshot?: unknown;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
