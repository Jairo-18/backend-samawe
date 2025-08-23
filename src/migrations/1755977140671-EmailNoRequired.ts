import { MigrationInterface, QueryRunner } from "typeorm";

export class EmailNoRequired1755977140671 implements MigrationInterface {
    name = 'EmailNoRequired1755977140671'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL`);
    }

}
