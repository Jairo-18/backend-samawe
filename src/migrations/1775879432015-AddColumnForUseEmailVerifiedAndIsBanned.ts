import { MigrationInterface, QueryRunner } from "typeorm";

export class AddColumnForUseEmailVerifiedAndIsBanned1775879432015 implements MigrationInterface {
    name = 'AddColumnForUseEmailVerifiedAndIsBanned1775879432015'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" ADD "isEmailVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "User" ADD "isBanned" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "isBanned"`);
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "isEmailVerified"`);
    }

}
