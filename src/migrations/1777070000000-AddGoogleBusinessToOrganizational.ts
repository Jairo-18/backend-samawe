import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleBusinessToOrganizational1777070000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Organizational" ADD COLUMN IF NOT EXISTS "googleBusinessRefreshToken" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "Organizational" ADD COLUMN IF NOT EXISTS "googleBusinessAccountName" varchar(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "Organizational" ADD COLUMN IF NOT EXISTS "googleBusinessLocationName" varchar(200)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Organizational" DROP COLUMN IF EXISTS "googleBusinessRefreshToken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Organizational" DROP COLUMN IF EXISTS "googleBusinessAccountName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Organizational" DROP COLUMN IF EXISTS "googleBusinessLocationName"`,
    );
  }
}
