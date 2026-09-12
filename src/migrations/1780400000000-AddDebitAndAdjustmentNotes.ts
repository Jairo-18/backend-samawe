import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nota débito (sobre facturas electrónicas) y nota de ajuste (sobre documentos
 * soporte), los dos documentos DIAN que faltaban.
 *
 *  1. Tabla `DebitNote`. Igual que `CreditNote` pero **sin `isTotal`**: los
 *     conceptos de la nota débito son intereses, gastos por cobrar, cambio del
 *     valor y otros — ninguno anula la factura.
 *  2. Tabla `AdjustmentNote`. Sí lleva `isTotal` (su motivo `2` es justamente
 *     "anulación del documento soporte") y guarda el número del documento
 *     soporte ajustado, que es como Factus lo referencia.
 *  3. Dos columnas de selección de rango en `Organizational`.
 *
 * ⚠️ Ninguno de los dos rangos necesita resolución DIAN: como las notas
 * crédito, se crean en Factus solo con `document`, `prefix` y `current`, y no
 * vencen. Los códigos de documento del rango son 23 (débito) y 25 (ajuste).
 *
 * Idempotente: `CREATE TABLE IF NOT EXISTS`, FK dentro de `DO $$` (ADD
 * CONSTRAINT no admite IF NOT EXISTS) y `ADD COLUMN IF NOT EXISTS`.
 */
export class AddDebitAndAdjustmentNotes1780400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "DebitNote" (
        "debitNoteId" SERIAL NOT NULL,
        "invoiceId" integer NOT NULL,
        "referenceCode" character varying(255) NOT NULL,
        "correctionConceptCode" character varying(5) NOT NULL,
        "factusNumber" character varying(255),
        "factusCude" character varying(255),
        "factusQrCode" text,
        "factusPublicUrl" text,
        "total" numeric(12,2) NOT NULL DEFAULT '0',
        "observation" character varying(250),
        "itemsSnapshot" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_DebitNote" PRIMARY KEY ("debitNoteId")
      )
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_DebitNote_invoice'
        ) THEN
          ALTER TABLE "DebitNote"
            ADD CONSTRAINT "FK_DebitNote_invoice"
            FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_DebitNote_invoiceId" ON "DebitNote" ("invoiceId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "AdjustmentNote" (
        "adjustmentNoteId" SERIAL NOT NULL,
        "invoiceId" integer NOT NULL,
        "referenceCode" character varying(255) NOT NULL,
        "correctionConceptCode" character varying(5) NOT NULL,
        "isTotal" boolean NOT NULL DEFAULT false,
        "supportDocumentNumber" character varying(255) NOT NULL,
        "factusNumber" character varying(255),
        "factusCuds" character varying(255),
        "factusQrCode" text,
        "factusPublicUrl" text,
        "total" numeric(12,2) NOT NULL DEFAULT '0',
        "observation" character varying(250),
        "itemsSnapshot" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_AdjustmentNote" PRIMARY KEY ("adjustmentNoteId")
      )
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_AdjustmentNote_invoice'
        ) THEN
          ALTER TABLE "AdjustmentNote"
            ADD CONSTRAINT "FK_AdjustmentNote_invoice"
            FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_AdjustmentNote_invoiceId" ON "AdjustmentNote" ("invoiceId")`,
    );

    await queryRunner.query(`
      ALTER TABLE "Organizational"
        ADD COLUMN IF NOT EXISTS "factusNumberingRangeIdDebitNote" integer,
        ADD COLUMN IF NOT EXISTS "factusNumberingRangeIdAdjustment" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Organizational"
        DROP COLUMN IF EXISTS "factusNumberingRangeIdDebitNote",
        DROP COLUMN IF EXISTS "factusNumberingRangeIdAdjustment"
    `);
    // Las tablas NO se borran: una nota ya validada por la DIAN es un documento
    // fiscal y su rastro local es lo único que lo liga a la factura. Si de
    // verdad hiciera falta, se hace a mano y con respaldo.
  }
}
