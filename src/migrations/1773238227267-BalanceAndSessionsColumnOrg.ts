import { MigrationInterface, QueryRunner } from 'typeorm';

export class BalanceAndSessionsColumnOrg1773238227267
  implements MigrationInterface
{
  name = 'BalanceAndSessionsColumnOrg1773238227267';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b3612ca41f34192567c3129bc1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Balance" ADD "organizationalId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "AccessSessions" ADD "organizationalId" uuid`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9f32944000f5f1f7b6244ff432" ON "Balance" ("type", "periodDate", "organizationalId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "Balance" ADD CONSTRAINT "FK_a35a996bad82c2275c6acc99e9a" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "AccessSessions" ADD CONSTRAINT "FK_3e365314d10d89fe01d740219ca" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "AccessSessions" DROP CONSTRAINT "FK_3e365314d10d89fe01d740219ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Balance" DROP CONSTRAINT "FK_a35a996bad82c2275c6acc99e9a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9f32944000f5f1f7b6244ff432"`,
    );
    await queryRunner.query(
      `ALTER TABLE "AccessSessions" DROP COLUMN "organizationalId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Balance" DROP COLUMN "organizationalId"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b3612ca41f34192567c3129bc1" ON "Balance" ("periodDate", "type") `,
    );
  }
}
