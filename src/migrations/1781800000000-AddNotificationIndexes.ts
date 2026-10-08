import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índices de `notifications`. Hasta hoy solo tenía la llave primaria, así que
 * cada carga de la campana (3 pestañas + contador de no leídas, para cada
 * usuario del personal y ahora también para cada huésped) recorría la tabla
 * entera, y la tabla solo crece (una fila por usuario del personal por cada
 * cambio de estado de una orden).
 *
 * - (usuario, fecha desc): listados paginados de cada pestaña.
 * - parcial de no leídas: el contador global, que se consulta con frecuencia.
 *
 * Aditiva e idempotente.
 */
export class AddNotificationIndexes1781800000000 implements MigrationInterface {
  name = 'AddNotificationIndexes1781800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user_created" ON "notifications" ("userUserId", "createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user_unread" ON "notifications" ("userUserId") WHERE "read" = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_unread"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_created"`);
  }
}
