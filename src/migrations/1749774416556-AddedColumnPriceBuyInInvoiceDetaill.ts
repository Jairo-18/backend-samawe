import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColumnPriceBuyInInvoiceDetaill1749774416556 implements MigrationInterface {
    name = 'AddedColumnPriceBuyInInvoiceDetaill1749774416556'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD "priceBuy" numeric(10,2) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP COLUMN "priceBuy"`);
    }

}
