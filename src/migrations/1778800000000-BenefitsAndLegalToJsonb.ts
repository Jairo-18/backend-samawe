import { MigrationInterface, QueryRunner } from 'typeorm';

export class BenefitsAndLegalToJsonb1778800000000 implements MigrationInterface {
  name = 'BenefitsAndLegalToJsonb1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // BenefitSection.title (NOT NULL)
    await queryRunner.query(
      `ALTER TABLE "BenefitSection" ALTER COLUMN "title" TYPE jsonb USING jsonb_build_object('es', "title")`,
    );

    // BenefitItem.name (NOT NULL)
    await queryRunner.query(
      `ALTER TABLE "BenefitItem" ALTER COLUMN "name" TYPE jsonb USING jsonb_build_object('es', "name")`,
    );

    // LegalItem.title (nullable)
    await queryRunner.query(
      `ALTER TABLE "LegalItem" ALTER COLUMN "title" TYPE jsonb USING CASE WHEN "title" IS NULL THEN NULL ELSE jsonb_build_object('es', "title") END`,
    );

    // LegalItem.description (nullable)
    await queryRunner.query(
      `ALTER TABLE "LegalItem" ALTER COLUMN "description" TYPE jsonb USING CASE WHEN "description" IS NULL THEN NULL ELSE jsonb_build_object('es', "description") END`,
    );

    // LegalItemChild.content (NOT NULL)
    await queryRunner.query(
      `ALTER TABLE "LegalItemChild" ALTER COLUMN "content" TYPE jsonb USING jsonb_build_object('es', "content")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "BenefitSection" ALTER COLUMN "title" TYPE varchar(150) USING "title"->>'es'`,
    );
    await queryRunner.query(
      `ALTER TABLE "BenefitItem" ALTER COLUMN "name" TYPE varchar(150) USING "name"->>'es'`,
    );
    await queryRunner.query(
      `ALTER TABLE "LegalItem" ALTER COLUMN "title" TYPE varchar(255) USING "title"->>'es'`,
    );
    await queryRunner.query(
      `ALTER TABLE "LegalItem" ALTER COLUMN "description" TYPE text USING "description"->>'es'`,
    );
    await queryRunner.query(
      `ALTER TABLE "LegalItemChild" ALTER COLUMN "content" TYPE text USING "content"->>'es'`,
    );
  }
}
