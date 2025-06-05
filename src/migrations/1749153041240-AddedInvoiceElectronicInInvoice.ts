import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedInvoiceElectronicInInvoice1749153041240 implements MigrationInterface {
    name = 'AddedInvoiceElectronicInInvoice1749153041240'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "invoiceElectronic" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "invoiceElectronic"`);
    }

}
