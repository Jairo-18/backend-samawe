import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaxeTypeToItems1776200000000 implements MigrationInterface {
  name = 'AddTaxeTypeToItems1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "taxeTypeId" integer NULL REFERENCES "TaxeType"("taxeTypeId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "Accommodation" ADD COLUMN IF NOT EXISTS "taxeTypeId" integer NULL REFERENCES "TaxeType"("taxeTypeId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "Excursion" ADD COLUMN IF NOT EXISTS "taxeTypeId" integer NULL REFERENCES "TaxeType"("taxeTypeId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Excursion" DROP COLUMN IF EXISTS "taxeTypeId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Accommodation" DROP COLUMN IF EXISTS "taxeTypeId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Product" DROP COLUMN IF EXISTS "taxeTypeId"`,
    );
  }
}
