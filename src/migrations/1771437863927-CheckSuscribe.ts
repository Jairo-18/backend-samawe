import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckSuscribe1771437863927 implements MigrationInterface {
  name = 'CheckSuscribe1771437863927';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" ADD "isPaid" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD "paidTotal" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "paidTotal"`);
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" DROP COLUMN "isPaid"`,
    );
  }
}
