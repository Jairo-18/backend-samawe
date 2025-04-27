import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColumnsForIdentificationTypesAndRoles1745748307275 implements MigrationInterface {
    name = 'AddedColumnsForIdentificationTypesAndRoles1745748307275'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "identificationType" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "identificationType" ADD "updatedAt" TIMESTAMP DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "identificationType" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "Role" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "Role" ADD "updatedAt" TIMESTAMP DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "Role" ADD "deletedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Role" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "Role" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "Role" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "identificationType" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "identificationType" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "identificationType" DROP COLUMN "createdAt"`);
    }

}
