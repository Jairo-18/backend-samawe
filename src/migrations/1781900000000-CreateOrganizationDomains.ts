import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-hotel, fase 1: qué hotel atiende cada host.
 *
 * - Tabla `organization_domains` (hostname único, un primario `web` por hotel).
 * - Siembra los hosts actuales de Samawe. La organización se busca por su SLUG,
 *   nunca "la primera": si el slug no existe, no se siembra nada y el arranque
 *   responderá 421 a todo, que es el fallo correcto (cerrado).
 * - Rol `PLATFORM_ADMIN`: operador de la plataforma, por encima de los hoteles.
 *
 * Los hosts de desarrollo (localhost, IP de la red) NO van aquí: los agrega
 * `scripts/seed-dev-domains.ts`, que solo corre contra dev.
 *
 * Aditiva e idempotente.
 */
export class CreateOrganizationDomains1781900000000 implements MigrationInterface {
  name = 'CreateOrganizationDomains1781900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_domains" (
        "id" SERIAL PRIMARY KEY,
        "organizationalId" uuid NOT NULL
          REFERENCES "Organizational"("organizationalId") ON DELETE CASCADE,
        "hostname" varchar(253) NOT NULL,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "kind" varchar(10) NOT NULL DEFAULT 'web',
        "status" varchar(12) NOT NULL DEFAULT 'pending',
        "verifiedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_organization_domains_hostname" UNIQUE ("hostname"),
        CONSTRAINT "CHK_organization_domains_kind"
          CHECK ("kind" IN ('web', 'api', 'staging')),
        CONSTRAINT "CHK_organization_domains_status"
          CHECK ("status" IN ('pending', 'active', 'disabled')),
        CONSTRAINT "CHK_organization_domains_hostname_normalized"
          CHECK ("hostname" = lower("hostname") AND "hostname" !~ '[:/ ]' AND "hostname" !~ '^www\\.')
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_organization_domains_primary_web"
        ON "organization_domains" ("organizationalId")
        WHERE "isPrimary" AND "kind" = 'web'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_organization_domains_org"
        ON "organization_domains" ("organizationalId")
    `);

    await queryRunner.query(`
      INSERT INTO "organization_domains"
        ("organizationalId", "hostname", "isPrimary", "kind", "status", "verifiedAt")
      SELECT o."organizationalId", d.hostname, d.is_primary, d.kind, 'active', now()
        FROM "Organizational" o
        CROSS JOIN (VALUES
          ('ecohotelsamawe.com',              true,  'web'),
          ('api.ecohotelsamawe.com',          false, 'api'),
          ('testfrontend.ecohotelsamawe.com', false, 'staging'),
          ('apidev.ecohotelsamawe.com',       false, 'staging')
        ) AS d(hostname, is_primary, kind)
       WHERE o."slug" = 'ecohotelsamawe'
      ON CONFLICT ("hostname") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "RoleType" ("code", "name")
      SELECT 'PLATFORM_ADMIN',
             '{"es": "ADMINISTRADOR DE PLATAFORMA", "en": "PLATFORM ADMINISTRATOR"}'::jsonb
       WHERE NOT EXISTS (SELECT 1 FROM "RoleType" WHERE "code" = 'PLATFORM_ADMIN')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // El rol solo se borra si nadie lo tiene: no dejar usuarios sin rol.
    await queryRunner.query(`
      DELETE FROM "RoleType" rt
       WHERE rt."code" = 'PLATFORM_ADMIN'
         AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."roleTypeId" = rt."roleTypeId")
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_domains"`);
  }
}
