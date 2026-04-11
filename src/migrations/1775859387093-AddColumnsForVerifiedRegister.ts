import { MigrationInterface, QueryRunner } from "typeorm";

export class AddColumnsForVerifiedRegister1775859387093 implements MigrationInterface {
    name = 'AddColumnsForVerifiedRegister1775859387093'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" ADD "emailVerificationToken" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "User" ADD "emailVerificationTokenExpiry" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "emailVerificationTokenExpiry"`);
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "emailVerificationToken"`);
    }

}
