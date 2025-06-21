import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColumnIsActiveUser1750540300855 implements MigrationInterface {
    name = 'AddedColumnIsActiveUser1750540300855'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "isActive"`);
    }

}
