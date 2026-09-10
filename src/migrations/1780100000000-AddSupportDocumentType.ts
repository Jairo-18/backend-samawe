import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Prepara el documento soporte electrónico (DIAN):
 *
 *  1. Siembra el `InvoiceType` **DSE** (Documento Soporte Electrónico). Al
 *     emitir, una factura de compra pasa de `FC` a `DSE`, igual que una venta
 *     pasa de `FV` a `FVE`.
 *  2. Siembra **FVE** si falta. Ese tipo nunca se creó por migración —se metió
 *     a mano en cada base—, así que una base nueva (o un entorno reconstruido)
 *     se queda sin él y la emisión revienta en `resolveInvoiceTypeId('FVE')`.
 *  3. Añade a `Organizational` la selección de rango de numeración por tipo de
 *     documento. Hasta ahora `factusNumberingRangeId` era uno solo y solo
 *     servía para ventas; con documento soporte hay al menos dos rangos vivos
 *     en la misma cuenta de Factus y `ranges[0]` deja de ser una elección
 *     válida.
 *
 * Idempotente: los INSERT usan `WHERE NOT EXISTS` (la tabla `InvoiceType` no
 * tiene índice único sobre `code`, así que `ON CONFLICT` no aplica) y las
 * columnas usan `ADD COLUMN IF NOT EXISTS`. Re-ejecutable sin efectos.
 */
export class AddSupportDocumentType1780100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Sincroniza la secuencia del SERIAL antes de insertar.
    //
    // En producción esto NO era opcional: el tipo FVE se insertó a mano con id
    // 4 sin pasar por la secuencia, así que `nextval` seguía devolviendo 4 y el
    // INSERT reventaba con "duplicate key ... (invoiceTypeId)=(4)". Es el mismo
    // desfase que arregla el script FIX IDS del proyecto, pero acotado a esta
    // tabla para que la migración no dependa de que alguien lo corra antes.
    //
    // El tercer argumento de setval es `is_called`: con la tabla vacía (max 0)
    // va en false para que el primer id sea 1 y no se salte el 1.
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('"InvoiceType"', 'invoiceTypeId'),
        GREATEST((SELECT COALESCE(MAX("invoiceTypeId"), 0) FROM "InvoiceType"), 1),
        (SELECT COALESCE(MAX("invoiceTypeId"), 0) FROM "InvoiceType") > 0
      )
    `);

    await queryRunner.query(`
      INSERT INTO "InvoiceType" ("code", "name")
      SELECT 'DSE', '{"es":"DOCUMENTO SOPORTE ELECTRONICO","en":"ELECTRONIC SUPPORT DOCUMENT"}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM "InvoiceType" WHERE "code" = 'DSE')
    `);

    await queryRunner.query(`
      INSERT INTO "InvoiceType" ("code", "name")
      SELECT 'FVE', '{"es":"FACTURA DE VENTA ELECTRONICA","en":"ELECTRONIC SALES INVOICE"}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM "InvoiceType" WHERE "code" = 'FVE')
    `);

    await queryRunner.query(`
      ALTER TABLE "Organizational"
        ADD COLUMN IF NOT EXISTS "factusNumberingRangeIdCreditNote" integer,
        ADD COLUMN IF NOT EXISTS "factusNumberingRangeIdSupport" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Organizational"
        DROP COLUMN IF EXISTS "factusNumberingRangeIdCreditNote",
        DROP COLUMN IF EXISTS "factusNumberingRangeIdSupport"
    `);

    // No se borra el InvoiceType DSE: si alguna factura ya quedó clasificada
    // así, borrarlo rompería la FK y dejaría documentos ya emitidos a la DIAN
    // sin tipo. Se limpia a mano si de verdad hiciera falta.
  }
}
