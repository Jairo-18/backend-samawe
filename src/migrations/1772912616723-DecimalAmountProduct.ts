import { MigrationInterface, QueryRunner } from "typeorm";

export class DecimalAmountProduct1772912616723 implements MigrationInterface {
    name = 'DecimalAmountProduct1772912616723'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Product" ALTER COLUMN "amount" TYPE numeric(10,3)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Product" ALTER COLUMN "amount" TYPE numeric(10,2)`);
    }

}
