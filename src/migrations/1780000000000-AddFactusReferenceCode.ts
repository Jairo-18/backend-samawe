import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega la columna `factusReferenceCode` a la tabla Invoice.
 *
 * Contexto: cuando Factus rechaza una factura con 409/Regla-90 (ya existe con
 * ese reference_code) y el sistema reintenta con sufijo (-v2, -v3…), el código
 * enviado a Factus difiere de invoice.code. Esta columna guarda el
 * reference_code real que Factus/DIAN conoce, desacoplándolo del código interno.
 * También se usa en el endpoint de recuperación (POST :id/recover) para registrar
 * qué variante de reference_code se encontró en Factus.
 *
 * Migración idempotente (ADD COLUMN IF NOT EXISTS).
 */
export class AddFactusReferenceCode1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Invoice"
        ADD COLUMN IF NOT EXISTS "factusReferenceCode" character varying(80)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Invoice"
        DROP COLUMN IF EXISTS "factusReferenceCode"
    `);
  }
}
