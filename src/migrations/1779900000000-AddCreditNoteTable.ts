import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla de notas crédito electrónicas (Factus / DIAN) emitidas sobre facturas
 * electrónicas de venta. Una factura puede tener varias (devoluciones parciales).
 */
export class AddCreditNoteTable1779900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "CreditNote" (
        "creditNoteId" SERIAL NOT NULL,
        "invoiceId" integer NOT NULL,
        "referenceCode" character varying(255) NOT NULL,
        "correctionConceptCode" character varying(5) NOT NULL,
        "isTotal" boolean NOT NULL DEFAULT false,
        "factusNumber" character varying(255),
        "factusCude" character varying(255),
        "factusQrCode" text,
        "factusPublicUrl" text,
        "total" numeric(12,2) NOT NULL DEFAULT '0',
        "observation" character varying(250),
        "itemsSnapshot" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_CreditNote" PRIMARY KEY ("creditNoteId")
      )
    `);
    // FK idempotente (ADD CONSTRAINT no soporta IF NOT EXISTS).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_CreditNote_invoice'
        ) THEN
          ALTER TABLE "CreditNote"
            ADD CONSTRAINT "FK_CreditNote_invoice"
            FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_CreditNote_invoiceId" ON "CreditNote" ("invoiceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "CreditNote"`);
  }
}
