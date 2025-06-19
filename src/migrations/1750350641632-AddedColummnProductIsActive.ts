import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColummnProductIsActive1750350641632 implements MigrationInterface {
    name = 'AddedColummnProductIsActive1750350641632'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Product" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Product" DROP COLUMN "isActive"`);
    }

}
