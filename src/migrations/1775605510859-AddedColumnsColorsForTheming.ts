import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColumnsColorsForTheming1775605510859 implements MigrationInterface {
    name = 'AddedColumnsColorsForTheming1775605510859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "textColor" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "titleColor" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "subtitleColor" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "bgPrimaryColor" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "bgSecondaryColor" character varying(20)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "bgSecondaryColor"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "bgPrimaryColor"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "subtitleColor"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "titleColor"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "textColor"`);
    }

}
