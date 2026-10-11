import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-hotel, fase 3: filas sin `organizationalId`.
 *
 * Algunas rutas de creación nunca lo asignaban (ahora lo pone
 * `TenantInsertSubscriber`). En la copia de prod del 11 oct quedaban sin hotel:
 * todas las imágenes de hospedaje (23), todas las notificaciones (26), todos
 * los menús (11) y 6 filas de Balance. Con los listados ya filtrados por hotel,
 * esas filas no las veía nadie, Samawe incluido (los menús desaparecieron del
 * panel).
 *
 * 1. Lo que tiene padre con hotel lo hereda: imágenes y renglones de su
 *    hospedaje/producto/servicio/factura, notificaciones de su usuario.
 * 2. `Balance` es un caché por hotel (índice único tipo+periodo+hotel). Sus
 *    filas sin hotel son el balde "global" de cuando había facturas sin hotel,
 *    y ya nadie las actualiza. Si Samawe ya tiene la fila de ese periodo, la
 *    huérfana es un duplicado viejo y se borra; si no, pasa a Samawe.
 * 3. Todo lo que quede sin hotel es anterior al multi-hotel, o sea de Samawe
 *    (se busca por SLUG, nunca por id). Se recorren TODAS las tablas con
 *    `organizationalId`, no una lista fija, para no dejar ninguna afuera.
 *
 * Idempotente: solo toca filas con `organizationalId` NULL. El `down` no hace
 * nada: no se puede saber qué filas estaban vacías, y volver a vaciarlas las
 * escondería otra vez.
 */
export class BackfillOrphanOrganization1782000000000 implements MigrationInterface {
  name = 'BackfillOrphanOrganization1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Heredar del padre.
    for (const [table, parent, fk] of [
      ['AccommodationImage', 'Accommodation', 'accommodationId'],
      ['ProductImage', 'Product', 'productId'],
      ['ExcursionImage', 'Excursion', 'excursionId'],
      ['InvoiceDetaill', 'Invoice', 'invoiceId'],
    ]) {
      await queryRunner.query(`
        UPDATE "${table}" c SET "organizationalId" = p."organizationalId"
          FROM "${parent}" p
         WHERE c."${fk}" = p."${fk}"
           AND c."organizationalId" IS NULL
           AND p."organizationalId" IS NOT NULL`);
    }
    await queryRunner.query(`
      UPDATE "notifications" n SET "organizationalId" = u."organizationalId"
        FROM "User" u
       WHERE n."userUserId" = u."userId"
         AND n."organizationalId" IS NULL
         AND u."organizationalId" IS NOT NULL`);

    const [samawe] = await queryRunner.query(
      `SELECT "organizationalId" AS id FROM "Organizational" WHERE slug = 'ecohotelsamawe'`,
    );
    // Sin Samawe (base nueva, sin seed) no hay a quién asignar el resto.
    if (!samawe) return;

    // 2. Balance: duplicados viejos fuera, el resto a Samawe.
    await queryRunner.query(
      `DELETE FROM "Balance" n
        WHERE n."organizationalId" IS NULL
          AND EXISTS (SELECT 1 FROM "Balance" s
                       WHERE s.type = n.type AND s."periodDate" = n."periodDate"
                         AND s."organizationalId" = $1)`,
      [samawe.id],
    );

    // 3. Todo lo demás sin hotel -> Samawe.
    const tables: Array<{ table_name: string }> = await queryRunner.query(
      `SELECT table_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND column_name = 'organizationalId'
          AND table_name NOT IN ('Organizational', 'organization_domains')`,
    );
    for (const { table_name } of tables) {
      await queryRunner.query(
        `UPDATE "${table_name}" SET "organizationalId" = $1 WHERE "organizationalId" IS NULL`,
        [samawe.id],
      );
    }
  }

  public async down(): Promise<void> {
    // Sin reversa: ver el comentario de la clase.
  }
}
