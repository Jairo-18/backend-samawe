import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índices en las claves foráneas y en las columnas por las que se filtra y
 * ordena. Postgres **no** crea índices automáticos para las FK (a diferencia de
 * las PK y los UNIQUE), y este esquema no los declaraba: `Invoice` e
 * `InvoiceDetaill` solo tenían su PK y el `UNIQUE (code, invoiceTypeId)`.
 *
 * Hoy no se nota —con 857 facturas y 6.577 detalles, Postgres recorre la tabla
 * entera más rápido que usar un índice, y de hecho seguirá haciéndolo hasta que
 * crezcan—, así que esto no es una optimización con efecto inmediato: es quitar
 * del camino la degradación que aparecería sola al acumular años de facturación.
 * El join `InvoiceDetaill.invoiceId` está en casi todas las consultas de
 * listados, reportes y estadísticas.
 *
 * Sin `CONCURRENTLY` a propósito: las migraciones de TypeORM corren dentro de
 * una transacción, donde `CREATE INDEX CONCURRENTLY` no está permitido. Con
 * estos volúmenes el bloqueo es de milisegundos. Si alguna vez hay que
 * recrearlos sobre tablas grandes, hacerlo a mano y fuera de la migración.
 *
 * Idempotente: `CREATE INDEX IF NOT EXISTS`.
 */
const INDEXES: { name: string; table: string; columns: string }[] = [
  // El join más frecuente de todo el sistema.
  { name: 'IDX_invoice_detaill_invoice', table: 'InvoiceDetaill', columns: '"invoiceId"' },
  // Reportes y estadísticas agrupan por estas tres.
  { name: 'IDX_invoice_detaill_product', table: 'InvoiceDetaill', columns: '"productId"' },
  { name: 'IDX_invoice_detaill_accommodation', table: 'InvoiceDetaill', columns: '"accommodationId"' },
  { name: 'IDX_invoice_detaill_excursion', table: 'InvoiceDetaill', columns: '"excursionId"' },
  // El calendario de reservas filtra por rango de fechas.
  { name: 'IDX_invoice_detaill_dates', table: 'InvoiceDetaill', columns: '"startDate", "endDate"' },

  // El listado pagina con ORDER BY startDate DESC.
  { name: 'IDX_invoice_start_date', table: 'Invoice', columns: '"startDate" DESC' },
  // Balance, reportes y el cron de limpieza filtran por createdAt.
  { name: 'IDX_invoice_created_at', table: 'Invoice', columns: '"createdAt"' },
  { name: 'IDX_invoice_user', table: 'Invoice', columns: '"userId"' },
  { name: 'IDX_invoice_type', table: 'Invoice', columns: '"invoiceTypeId"' },
  { name: 'IDX_invoice_organizational', table: 'Invoice', columns: '"organizationalId"' },
  // Recuperación por referencia Factus: se consulta por número exacto.
  { name: 'IDX_invoice_factus_number', table: 'Invoice', columns: '"factusNumber"' },

  // El neteo de notas crédito agrupa por factura.
  { name: 'IDX_credit_note_invoice', table: 'CreditNote', columns: '"invoiceId"' },

  { name: 'IDX_balance_organizational', table: 'Balance', columns: '"organizationalId"' },
  { name: 'IDX_access_sessions_user', table: 'AccessSessions', columns: '"userId"' },
];

export class AddPerformanceIndexes1780300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const idx of INDEXES) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${idx.name}" ON "${idx.table}" (${idx.columns})`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const idx of INDEXES) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${idx.name}"`);
    }
  }
}
