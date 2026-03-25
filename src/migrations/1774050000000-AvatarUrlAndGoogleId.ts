import { MigrationInterface, QueryRunner } from 'typeorm';

export class AvatarUrlAndGoogleId1774050000000 implements MigrationInterface {
  name = 'AvatarUrlAndGoogleId1774050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" character varying(500)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_User_googleId" ON "User" ("googleId") WHERE "googleId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_User_googleId"`);
    await queryRunner.query(
      `ALTER TABLE "User" DROP COLUMN IF EXISTS "avatarUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" DROP COLUMN IF EXISTS "googleId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL`,
    );
  }
}
