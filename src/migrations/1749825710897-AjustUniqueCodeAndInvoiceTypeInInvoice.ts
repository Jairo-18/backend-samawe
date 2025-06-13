import { MigrationInterface, QueryRunner } from "typeorm";

export class AjustUniqueCodeAndInvoiceTypeInInvoice1749825710897 implements MigrationInterface {
    name = 'AjustUniqueCodeAndInvoiceTypeInInvoice1749825710897'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "UQ_b49c39b8f77d6946cf268bbd2c0"`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "UQ_invoice_code_per_type" UNIQUE ("code", "invoiceTypeId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "UQ_invoice_code_per_type"`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "UQ_b49c39b8f77d6946cf268bbd2c0" UNIQUE ("code")`);
    }

}
