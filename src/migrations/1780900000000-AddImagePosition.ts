import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Orden manual de la galería de fotos (productos, hospedajes, pasadías).
 *
 * Hasta ahora no había ningún campo de orden: el editor mostraba las fotos
 * más nuevas primero (`ORDER BY imageId DESC`, solo en el front) y el resto
 * de la app (tarjetas del listado, ficha pública, `images[0]` como portada)
 * dependía del orden que Postgres devolviera por defecto, sin `ORDER BY`
 * explícito — nadie podía decidir cuál foto va primero.
 *
 * `position` (0 = primera / portada) es ahora la fuente de verdad, y la
 * fijan los servicios de backend y el usuario arrastrando en la galería.
 *
 * El backfill conserva el orden actual: numera por `imageId` ascendente
 * (orden de subida), que es lo más parecido a "sin cambios visibles" para
 * quien ya tenía fotos cargadas.
 */
export class AddImagePosition1780900000000 implements MigrationInterface {
  name = 'AddImagePosition1780900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ProductImage"
        ADD COLUMN IF NOT EXISTS "position" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      WITH ranked AS (
        SELECT "productImageId",
               ROW_NUMBER() OVER (PARTITION BY "productId" ORDER BY "productImageId" ASC) - 1 AS rn
          FROM "ProductImage"
      )
      UPDATE "ProductImage" pi
         SET "position" = ranked.rn
        FROM ranked
       WHERE pi."productImageId" = ranked."productImageId"
    `);

    await queryRunner.query(`
      ALTER TABLE "AccommodationImage"
        ADD COLUMN IF NOT EXISTS "position" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      WITH ranked AS (
        SELECT "accommodationImageId",
               ROW_NUMBER() OVER (PARTITION BY "accommodationId" ORDER BY "accommodationImageId" ASC) - 1 AS rn
          FROM "AccommodationImage"
      )
      UPDATE "AccommodationImage" ai
         SET "position" = ranked.rn
        FROM ranked
       WHERE ai."accommodationImageId" = ranked."accommodationImageId"
    `);

    await queryRunner.query(`
      ALTER TABLE "ExcursionImage"
        ADD COLUMN IF NOT EXISTS "position" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      WITH ranked AS (
        SELECT "excursionImageId",
               ROW_NUMBER() OVER (PARTITION BY "excursionId" ORDER BY "excursionImageId" ASC) - 1 AS rn
          FROM "ExcursionImage"
      )
      UPDATE "ExcursionImage" ei
         SET "position" = ranked.rn
        FROM ranked
       WHERE ei."excursionImageId" = ranked."excursionImageId"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ExcursionImage" DROP COLUMN IF EXISTS "position"`,
    );
    await queryRunner.query(
      `ALTER TABLE "AccommodationImage" DROP COLUMN IF EXISTS "position"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProductImage" DROP COLUMN IF EXISTS "position"`,
    );
  }
}
