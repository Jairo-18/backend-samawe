import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedResetTokenInUser1750185536655 implements MigrationInterface {
    name = 'AddedResetTokenInUser1750185536655'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" ADD "resetToken" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "User" ADD "resetTokenExpiry" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "resetTokenExpiry"`);
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "resetToken"`);
    }

}
