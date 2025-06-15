import { MigrationInterface, QueryRunner } from "typeorm";

export class AjustTableBalanceUniqueTypeAndPeriod1749993291148 implements MigrationInterface {
    name = 'AjustTableBalanceUniqueTypeAndPeriod1749993291148'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b3612ca41f34192567c3129bc1" ON "Balance" ("type", "periodDate") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_b3612ca41f34192567c3129bc1"`);
    }

}
