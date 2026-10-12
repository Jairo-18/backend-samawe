import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hospedajes para un motel (Crazy Love):
 *
 * 1. `hasMotorcycleParking` / `hasCarParking`: NOT NULL DEFAULT false. Samawe no
 *    los maneja, así que todos los existentes quedan en false.
 * 2. Tabla `AccommodationRate`: tarifa por horas de estadía (4 h, 8 h…), una por
 *    (hospedaje, horas).
 * 3. Samawe es un hotel: cada hospedaje suyo recibe UNA tarifa de 24 horas igual
 *    a su `priceSale` (que sigue siendo el precio que usa la facturación). Solo
 *    los que no tengan ya una de 24 h.
 *
 * Idempotente (IF NOT EXISTS / ON CONFLICT). El `down` deshace todo.
 */
export class AccommodationParkingAndRates1782100000000 implements MigrationInterface {
  name = 'AccommodationParkingAndRates1782100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Accommodation"
        ADD COLUMN IF NOT EXISTS "hasMotorcycleParking" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "hasCarParking" boolean NOT NULL DEFAULT false`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "AccommodationRate" (
        "accommodationRateId" SERIAL PRIMARY KEY,
        "hours" integer NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "accommodationId" integer NOT NULL
          REFERENCES "Accommodation"("accommodationId") ON DELETE CASCADE,
        "organizationalId" uuid
          REFERENCES "Organizational"("organizationalId"),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_AccommodationRate_hours" CHECK ("hours" BETWEEN 1 AND 72),
        CONSTRAINT "CHK_AccommodationRate_price" CHECK ("price" >= 0)
      )`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_AccommodationRate_accommodation_hours"
        ON "AccommodationRate" ("accommodationId", "hours")`);

    await queryRunner.query(`
      INSERT INTO "AccommodationRate" ("hours", "price", "accommodationId", "organizationalId")
      SELECT 24, a."priceSale", a."accommodationId", a."organizationalId"
        FROM "Accommodation" a
        JOIN "Organizational" o ON o."organizationalId" = a."organizationalId"
       WHERE o.slug = 'ecohotelsamawe'
         AND a."deletedAt" IS NULL
      ON CONFLICT ("accommodationId", "hours") DO NOTHING`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "AccommodationRate"`);
    await queryRunner.query(`
      ALTER TABLE "Accommodation"
        DROP COLUMN IF EXISTS "hasMotorcycleParking",
        DROP COLUMN IF EXISTS "hasCarParking"`);
  }
}
