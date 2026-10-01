import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Notas crédito que neutralizan notas débito.
 *
 * Factus no ofrece anular una nota débito ya validada; la salida estándar es una
 * nota crédito sobre la factura que cubra también el valor de la nota débito.
 * Esta columna guarda qué notas débito cubrió cada nota crédito.
 *
 * Aditiva e idempotente: las notas crédito existentes quedan en NULL.
 */
export class AddCreditNoteNeutralizedDebitNotes1781200000000
  implements MigrationInterface
{
  name = 'AddCreditNoteNeutralizedDebitNotes1781200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CreditNote" ADD COLUMN IF NOT EXISTS "neutralizedDebitNoteIds" integer[]`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CreditNote" DROP COLUMN IF EXISTS "neutralizedDebitNoteIds"`,
    );
  }
}
