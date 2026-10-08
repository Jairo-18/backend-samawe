import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nuevo tipo de notificación para la pestaña "Reservaciones": llega cuando un
 * huésped pide una reserva en línea. Solo agrega un valor al enum, así que no
 * toca datos existentes. Aditiva e idempotente.
 */
export class AddReservationNotificationType1781500000000
  implements MigrationInterface
{
  name = 'AddReservationNotificationType1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'RESERVATION_REQUESTED'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres no permite quitar un valor de un enum sin recrearlo; dejarlo no
    // estorba a nada.
  }
}
