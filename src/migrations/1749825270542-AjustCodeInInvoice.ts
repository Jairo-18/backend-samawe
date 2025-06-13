import { MigrationInterface, QueryRunner } from "typeorm";

export class AjustCodeInInvoice1749825270542 implements MigrationInterface {
    name = 'AjustCodeInInvoice1749825270542'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "UQ_b49c39b8f77d6946cf268bbd2c0" UNIQUE ("code")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "UQ_b49c39b8f77d6946cf268bbd2c0"`);
    }

}
