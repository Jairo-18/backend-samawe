import { MigrationInterface, QueryRunner } from 'typeorm';

export class MenuNameDescToJsonb1778900000000 implements MigrationInterface {
  name = 'MenuNameDescToJsonb1778900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Menu" ALTER COLUMN "name" TYPE jsonb USING jsonb_build_object('es', "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "Menu" ALTER COLUMN "description" TYPE jsonb USING CASE WHEN "description" IS NULL THEN NULL ELSE jsonb_build_object('es', "description") END`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Menu" ALTER COLUMN "name" TYPE varchar(255) USING "name"->>'es'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Menu" ALTER COLUMN "description" TYPE varchar(500) USING "description"->>'es'`,
    );
  }
}
