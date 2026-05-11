import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorporateValueTitleDescToJsonb1779000000000
  implements MigrationInterface
{
  name = 'CorporateValueTitleDescToJsonb1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // title (NOT NULL)
    await queryRunner.query(
      `ALTER TABLE "CorporateValue" ALTER COLUMN "title" TYPE jsonb USING jsonb_build_object('es', "title")`,
    );

    // description (nullable)
    await queryRunner.query(
      `ALTER TABLE "CorporateValue" ALTER COLUMN "description" TYPE jsonb USING CASE WHEN "description" IS NULL THEN NULL ELSE jsonb_build_object('es', "description") END`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CorporateValue" ALTER COLUMN "title" TYPE varchar(150) USING "title"->>'es'`,
    );
    await queryRunner.query(
      `ALTER TABLE "CorporateValue" ALTER COLUMN "description" TYPE text USING "description"->>'es'`,
    );
  }
}
