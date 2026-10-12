import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Host del PANEL de la plataforma (`organization_domains.isPanel`).
 *
 * En un host de panel, con sesión, el hotel de la petición es el del usuario
 * (su JWT); sin sesión (web pública) sigue siendo el del host. Así un solo
 * panel y una sola API (la de Samawe) sirven a todos los hoteles: el front ya
 * no tiene que adivinar a qué API mandar cada petición.
 *
 * Se marcan los hosts de API de Samawe (`api.` y `apidev.`) y, si existen
 * (solo en desarrollo), `localhost` y `127.0.0.1`. Las APIs de cada hotel
 * (`api-crazylove…`) siguen estrictas: la sesión tiene que ser de ese hotel.
 *
 * Idempotente. El `down` quita la columna.
 */
export class PanelHosts1782200000000 implements MigrationInterface {
  name = 'PanelHosts1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organization_domains"
        ADD COLUMN IF NOT EXISTS "isPanel" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`
      UPDATE "organization_domains" d SET "isPanel" = true
        FROM "Organizational" o
       WHERE o."organizationalId" = d."organizationalId"
         AND o.slug = 'ecohotelsamawe'
         AND d.hostname IN ('api.ecohotelsamawe.com', 'apidev.ecohotelsamawe.com', 'localhost', '127.0.0.1')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organization_domains" DROP COLUMN IF EXISTS "isPanel"`);
  }
}
