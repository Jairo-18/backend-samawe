import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reservas de estadía hechas por el propio huésped (flujo online).
 *
 * Una reserva sigue siendo una factura (ver §10 de contexto.md). Se añaden solo
 * dos columnas, ambas NULL para todo lo existente:
 *
 *  - `reservationSource`: 'ONLINE' si la creó el huésped. NULL = la creó el
 *    personal, que es todo el histórico y sigue sin vencimiento.
 *  - `reservationExpiresAt`: hasta cuándo se retienen las fechas sin pago. Solo
 *    se llena en las ONLINE; el cron libera las vencidas.
 *
 * El índice es parcial: la inmensa mayoría de las facturas no es una reserva
 * online, y la consulta del cron solo mira las que tienen vencimiento.
 *
 * Aditiva e idempotente.
 */
export class AddOnlineReservation1781300000000 implements MigrationInterface {
  name = 'AddOnlineReservation1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "reservationSource" varchar(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "reservationExpiresAt" timestamp`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invoice_reservation_expires"
         ON "Invoice" ("reservationExpiresAt")
         WHERE "reservationExpiresAt" IS NOT NULL AND "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_invoice_reservation_expires"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "reservationExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "reservationSource"`,
    );
  }
}
