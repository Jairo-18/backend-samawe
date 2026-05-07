import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = [
  'CategoryType',
  'StateType',
  'BedType',
  'RoleType',
  'IdentificationType',
  'InvoiceType',
  'TaxeType',
  'PayType',
  'PaidType',
  'PersonType',
  'MediaType',
  'UnitOfMeasure',
];

export class NameToJsonbTypes1778500000000 implements MigrationInterface {
  name = 'NameToJsonbTypes1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "name" TYPE jsonb USING jsonb_build_object('es', "name")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "name" TYPE varchar(255) USING "name"->>'es'`,
      );
    }
  }
}
