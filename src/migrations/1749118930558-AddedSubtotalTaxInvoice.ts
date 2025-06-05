import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedSubtotalTaxInvoice1749118930558 implements MigrationInterface {
    name = 'AddedSubtotalTaxInvoice1749118930558'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "subtotal"`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "subtotalWithoutTax" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "subtotalWithTax" numeric(10,2) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "subtotalWithTax"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "subtotalWithoutTax"`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "subtotal" numeric(10,2) NOT NULL DEFAULT '0'`);
    }

}
