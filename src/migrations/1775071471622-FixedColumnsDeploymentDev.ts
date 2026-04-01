import { MigrationInterface, QueryRunner } from "typeorm";

export class FixedColumnsDeploymentDev1775071471622 implements MigrationInterface {
    name = 'FixedColumnsDeploymentDev1775071471622'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CorporateValue" ADD "imagePublicId" character varying(300)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CorporateValue" DROP COLUMN "imagePublicId"`);
    }

}
