import { MigrationInterface, QueryRunner } from "typeorm";

export class PublicIdOrganizationImage1773257059067 implements MigrationInterface {
    name = 'PublicIdOrganizationImage1773257059067'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "OrganizationalMedia" ADD "publicId" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "OrganizationalMedia" DROP COLUMN "publicId"`);
    }

}
