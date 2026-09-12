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
 * Nota de ajuste a DOCUMENTO SOPORTE (Factus / DIAN).
 *
 * Es a los documentos soporte lo que la nota crédito es a las facturas: el
 * único modo de corregir o anular uno ya validado. Su contraparte es un
 * **proveedor**, no un cliente, porque el documento soporte lo emite el
 * comprador en adquisiciones a no obligados a facturar.
 *
 * Motivos DIAN: `1` devolución parcial, `2` anulación del documento soporte,
 * `3` rebaja o descuento, `4` ajuste de precio, `5` otros.
 *
 * ⚠️ El identificador que devuelve Factus es el **CUDS**, no CUFE ni CUDE, igual
 * que en el documento soporte del que cuelga.
 */
@Entity({ name: 'AdjustmentNote' })
export class AdjustmentNote {
  @PrimaryGeneratedColumn()
  adjustmentNoteId: number;

  /** La compra que se emitió como documento soporte (tipo DSE). */
  @Column('integer')
  invoiceId: number;

  @ManyToOne(() => Invoice, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column('varchar', { length: 255 })
  referenceCode: string;

  /** Motivo DIAN de la nota de ajuste ('1'–'5'). */
  @Column('varchar', { length: 5 })
  correctionConceptCode: string;

  /** true = anula el documento soporte completo (motivo '2'). */
  @Column('boolean', { default: false })
  isTotal: boolean;

  /** Número del documento soporte ajustado, tal como lo dio Factus (p. ej. DSE43). */
  @Column('varchar', { length: 255 })
  supportDocumentNumber: string;

  /** Número de la nota de ajuste devuelto por Factus. */
  @Column('varchar', { length: 255, nullable: true })
  factusNumber?: string;

  /** CUDS de la nota de ajuste. */
  @Column('varchar', { length: 255, nullable: true })
  factusCuds?: string;

  @Column('text', { nullable: true })
  factusQrCode?: string;

  @Column('text', { nullable: true })
  factusPublicUrl?: string;

  @Column('numeric', { precision: 12, scale: 2, default: 0 })
  total: string;

  @Column('varchar', { length: 250, nullable: true })
  observation?: string;

  /** Snapshot de los ítems ajustados (lo que se envió a Factus). */
  @Column({ type: 'jsonb', nullable: true })
  itemsSnapshot?: unknown;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
