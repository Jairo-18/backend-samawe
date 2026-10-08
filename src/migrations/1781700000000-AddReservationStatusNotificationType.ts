import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tipo de notificación para el huésped: estado de su reserva en línea
 * (aprobada, vencida o no aceptada). Solo agrega un valor al enum. Aditiva e
 * idempotente.
 */
export class AddReservationStatusNotificationType1781700000000
  implements MigrationInterface
{
  name = 'AddReservationStatusNotificationType1781700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'RESERVATION_STATUS'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres no permite quitar un valor de un enum sin recrearlo.
  }
}
