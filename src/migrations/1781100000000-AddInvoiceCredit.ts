import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Facturas a crédito con plazo (30/60/90 días) y abonos.
 *
 * - `Invoice.creditDays / creditStartDate / dueDate`: el plazo y su vencimiento
 *   final (lo único que se manda a la DIAN, `payment_details[].due_date`).
 * - `InvoicePayment`: abonos recibidos. Las cuotas no se guardan, se derivan.
 *
 * Aditiva e idempotente: las facturas a crédito que ya existen quedan con
 * plazo NULL (hay que definirlo antes de emitirlas electrónicamente).
 */
export class AddInvoiceCredit1781100000000 implements MigrationInterface {
  name = 'AddInvoiceCredit1781100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "creditDays" smallint`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "creditStartDate" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "dueDate" date`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "Invoice" ADD CONSTRAINT "CHK_Invoice_creditDays"
          CHECK ("creditDays" IS NULL OR "creditDays" IN (30, 60, 90));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "InvoicePayment" (
        "invoicePaymentId" SERIAL PRIMARY KEY,
        "invoiceId" integer NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "payTypeId" integer,
        "paidAt" date NOT NULL,
        "note" varchar(255),
        "employeeId" uuid,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_InvoicePayment_amount" CHECK ("amount" > 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_InvoicePayment_invoiceId" ON "InvoicePayment" ("invoiceId")`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "InvoicePayment" ADD CONSTRAINT "FK_InvoicePayment_invoiceId"
          FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "InvoicePayment" ADD CONSTRAINT "FK_InvoicePayment_payTypeId"
          FOREIGN KEY ("payTypeId") REFERENCES "PayType"("payTypeId");
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "InvoicePayment" ADD CONSTRAINT "FK_InvoicePayment_employeeId"
          FOREIGN KEY ("employeeId") REFERENCES "User"("userId");
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "InvoicePayment"`);
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "CHK_Invoice_creditDays"`,
    );
    await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "dueDate"`);
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "creditStartDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "creditDays"`,
    );
  }
}
