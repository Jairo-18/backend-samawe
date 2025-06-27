import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColumnMetaDataInNotification1750974149573 implements MigrationInterface {
    name = 'AddedColumnMetaDataInNotification1750974149573'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "metadata" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "metadata"`);
    }

}
