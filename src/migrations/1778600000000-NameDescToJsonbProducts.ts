import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = ['Accommodation', 'Excursion', 'Product'];

export class NameDescToJsonbProducts1778600000000 implements MigrationInterface {
  name = 'NameDescToJsonbProducts1778600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "name" TYPE jsonb USING jsonb_build_object('es', "name")`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "description" TYPE jsonb USING CASE WHEN "description" IS NULL THEN NULL ELSE jsonb_build_object('es', "description") END`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "name" TYPE varchar(255) USING "name"->>'es'`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "description" TYPE varchar(500) USING "description"->>'es'`,
      );
    }
  }
}
