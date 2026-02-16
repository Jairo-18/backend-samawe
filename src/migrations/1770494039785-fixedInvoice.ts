import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixedInvoice1770494039785 implements MigrationInterface {
  name = 'FixedInvoice1770494039785';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* =======================
       Invoice
    ======================= */
    await queryRunner.query(`
      ALTER TABLE "Invoice"
      ADD COLUMN IF NOT EXISTS "stateTypeId" integer,
      ADD COLUMN IF NOT EXISTS "tableNumber" integer
    `);

    // FK Invoice -> StateType
    await queryRunner.query(`
      ALTER TABLE "Invoice"
      DROP CONSTRAINT IF EXISTS "FK_invoice_stateType"
    `);

    await queryRunner.query(`
      ALTER TABLE "Invoice"
      ADD CONSTRAINT "FK_invoice_stateType"
      FOREIGN KEY ("stateTypeId")
      REFERENCES "StateType"("stateTypeId")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    /* =======================
       InvoiceDetaill
    ======================= */
    await queryRunner.query(`
      ALTER TABLE "InvoiceDetaill"
      ADD COLUMN IF NOT EXISTS "orderTime" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "readyTime" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "servedTime" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "stateTypeId" integer
    `);

    // FK InvoiceDetaill -> StateType
    await queryRunner.query(`
      ALTER TABLE "InvoiceDetaill"
      DROP CONSTRAINT IF EXISTS "FK_invoiceDetail_stateType"
    `);

    await queryRunner.query(`
      ALTER TABLE "InvoiceDetaill"
      ADD CONSTRAINT "FK_invoiceDetail_stateType"
      FOREIGN KEY ("stateTypeId")
      REFERENCES "StateType"("stateTypeId")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "InvoiceDetaill"
      DROP CONSTRAINT IF EXISTS "FK_invoiceDetail_stateType"
    `);

    await queryRunner.query(`
      ALTER TABLE "Invoice"
      DROP CONSTRAINT IF EXISTS "FK_invoice_stateType"
    `);

    await queryRunner.query(`
      ALTER TABLE "Invoice"
      DROP COLUMN IF EXISTS "stateTypeId",
      DROP COLUMN IF EXISTS "tableNumber"
    `);

    await queryRunner.query(`
      ALTER TABLE "InvoiceDetaill"
      DROP COLUMN IF EXISTS "stateTypeId",
      DROP COLUMN IF EXISTS "orderTime",
      DROP COLUMN IF EXISTS "readyTime",
      DROP COLUMN IF EXISTS "servedTime"
    `);
  }
}
