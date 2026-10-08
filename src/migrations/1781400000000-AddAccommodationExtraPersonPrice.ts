import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Valor por noche de cada huésped por encima de las personas incluidas en el
 * precio del hospedaje (`amountPerson`). Default 0: ningún hospedaje cobra extra
 * hasta que el hotel lo configure, así que los precios actuales no cambian.
 *
 * Aditiva e idempotente.
 */
export class AddAccommodationExtraPersonPrice1781400000000
  implements MigrationInterface
{
  name = 'AddAccommodationExtraPersonPrice1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Accommodation" ADD COLUMN IF NOT EXISTS "extraPersonPrice" numeric(10,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Accommodation" DROP COLUMN IF EXISTS "extraPersonPrice"`,
    );
  }
}
