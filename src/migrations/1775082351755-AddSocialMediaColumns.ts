import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSocialMediaColumns1775082351755 implements MigrationInterface {
    name = 'AddSocialMediaColumns1775082351755'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "facebookUrl" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "instagramUrl" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "instagramUrl"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "facebookUrl"`);
    }

}
