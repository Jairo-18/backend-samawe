import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColumnImageUrlAndVideoUrl1775066282297 implements MigrationInterface {
    name = 'AddedColumnImageUrlAndVideoUrl1775066282297'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CorporateValue" ADD "imageUrl" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "videoUrl" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "videoUrl"`);
        await queryRunner.query(`ALTER TABLE "CorporateValue" DROP COLUMN "imageUrl"`);
    }

}
