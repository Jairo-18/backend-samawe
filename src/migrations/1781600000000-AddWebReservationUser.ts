import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Usuario interno "RESERVACIÓN WEB": el empleado que figura en las facturas que
 * crea el propio huésped desde la web (no hay una persona de por medio).
 *
 * - Inactivo y sin contraseña: no puede iniciar sesión.
 * - Rol USER: no recibe notificaciones del personal ni aparece como empleado.
 * - Documento propio ('WEB-RESERVA'), distinto del de Consumidor Final
 *   (222222222222), para no duplicar ese cliente en las búsquedas.
 * - Los catálogos obligatorios se copian de Consumidor Final si existe; si no,
 *   se toma el primero disponible, así corre igual en cualquier base.
 *
 * Idempotente: se identifica por el correo y no hace nada si ya existe.
 */
export class AddWebReservationUser1781600000000 implements MigrationInterface {
  name = 'AddWebReservationUser1781600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "User" (
        "identificationNumber", "firstName", "lastName", "email", "phone",
        "isActive", "isEmailVerified", "isBanned",
        "roleTypeId", "identificationTypeId", "personTypeId", "phoneCodeId", "organizationalId"
      )
      SELECT
        'WEB-RESERVA', 'RESERVACIÓN', 'WEB', 'reservacion.web@samawe.internal', '0',
        false, true, false,
        (SELECT "roleTypeId" FROM "RoleType" WHERE code = 'USER' LIMIT 1),
        COALESCE(cf."identificationTypeId", (SELECT "identificationTypeId" FROM "IdentificationType" ORDER BY 1 LIMIT 1)),
        COALESCE(cf."personTypeId", (SELECT "personTypeId" FROM "PersonType" ORDER BY 1 LIMIT 1)),
        COALESCE(cf."phoneCodeId", (SELECT "phoneCodeId" FROM "phone_code" ORDER BY 1 LIMIT 1)),
        COALESCE(cf."organizationalId", (SELECT "organizationalId" FROM "Organizational" ORDER BY 1 LIMIT 1))
      FROM (SELECT 1) AS dummy
      LEFT JOIN "User" cf ON cf."identificationNumber" = '222222222222'
      WHERE NOT EXISTS (
        SELECT 1 FROM "User" WHERE "email" = 'reservacion.web@samawe.internal'
      )
      LIMIT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Solo si no tiene facturas: borrar un empleado referenciado fallaría.
    await queryRunner.query(`
      DELETE FROM "User" u
       WHERE u."email" = 'reservacion.web@samawe.internal'
         AND NOT EXISTS (SELECT 1 FROM "Invoice" i WHERE i."employeeId" = u."userId")
    `);
  }
}
