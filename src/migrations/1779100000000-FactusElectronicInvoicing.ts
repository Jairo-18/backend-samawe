import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Facturación electrónica (Factus API v2) — migración consolidada.
 *
 * Reúne en un solo paso TODO lo que el módulo Factus necesita en la base de
 * datos para emitir facturas electrónicas a la DIAN. Reemplaza a las antiguas
 * migraciones 1779100000000–1779600000000 (campos + backfills), que nunca se
 * desplegaron a producción.
 *
 * Diseño:
 * - 100% idempotente: ADD COLUMN IF NOT EXISTS + backfills con `WHERE ... IS NULL`.
 *   Es seguro correrla sobre una base que ya tenga (parte de) estas columnas,
 *   y no pisa datos ya cargados.
 * - El backfill de configuración de la organización NO depende del UUID
 *   (la app es mono-tenant: una sola organización, Eco Hotel Samawé). La versión
 *   vieja hardcodeaba el UUID de DEV y por eso fallaba en otros entornos.
 *
 * Cubre:
 *   1. Organizational → configuración del emisor (rango DIAN, municipio, dv, etc.)
 *   2. User          → datos fiscales del cliente + dirección
 *   3. Invoice       → resultado de la emisión (número, CUFE, QR, enlace público)
 *   4. TaxeType      → código de impuesto DIAN (factusCode)
 *   5. IdentificationType → código de documento DIAN (factusCode)
 *   6. Backfill de catálogos y de la config del emisor
 */
export class FactusElectronicInvoicing1779100000000
  implements MigrationInterface
{
  name = 'FactusElectronicInvoicing1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Organizational — configuración del emisor ────────────────────────
    await queryRunner.query(`
      ALTER TABLE "Organizational"
        ADD COLUMN IF NOT EXISTS "factusNumberingRangeId"      integer,
        ADD COLUMN IF NOT EXISTS "factusMunicipalityCode"      varchar(10),
        ADD COLUMN IF NOT EXISTS "factusDv"                    varchar(2),
        ADD COLUMN IF NOT EXISTS "factusTributeCode"           varchar(10) DEFAULT 'ZZ',
        ADD COLUMN IF NOT EXISTS "factusLegalOrganizationCode" varchar(2)  DEFAULT '1'
    `);

    // ── 2. User — datos fiscales del cliente + dirección ────────────────────
    await queryRunner.query(`
      ALTER TABLE "User"
        ADD COLUMN IF NOT EXISTS "address"                     varchar(255),
        ADD COLUMN IF NOT EXISTS "factusMunicipalityCode"      varchar(10),
        ADD COLUMN IF NOT EXISTS "factusDv"                    varchar(2),
        ADD COLUMN IF NOT EXISTS "factusTributeCode"           varchar(10) DEFAULT 'ZZ',
        ADD COLUMN IF NOT EXISTS "factusLegalOrganizationCode" varchar(2)  DEFAULT '2'
    `);

    // ── 3. Invoice — resultado de la emisión electrónica ────────────────────
    await queryRunner.query(`
      ALTER TABLE "Invoice"
        ADD COLUMN IF NOT EXISTS "factusNumber"    varchar(50),
        ADD COLUMN IF NOT EXISTS "factusCufe"      text,
        ADD COLUMN IF NOT EXISTS "factusQrCode"    text,
        ADD COLUMN IF NOT EXISTS "factusPublicUrl" text,
        ADD COLUMN IF NOT EXISTS "factusSentAt"    timestamp
    `);

    // ── 4. TaxeType — código de impuesto DIAN ───────────────────────────────
    //   "01" = IVA  |  "04" = INC (Impuesto Nacional al Consumo)
    await queryRunner.query(
      `ALTER TABLE "TaxeType" ADD COLUMN IF NOT EXISTS "factusCode" varchar(5)`,
    );
    await queryRunner.query(`
      UPDATE "TaxeType" SET "factusCode" = CASE
        WHEN "taxeTypeId" = 1 THEN '01'   -- IVA 19%
        WHEN "taxeTypeId" = 2 THEN '01'   -- Sin impuesto 0% (IVA 0%)
        WHEN "taxeTypeId" = 3 THEN '04'   -- IPOCONSUMO 8%
        WHEN "taxeTypeId" = 4 THEN '04'   -- IPOCONSUMO 5%
        WHEN "taxeTypeId" = 5 THEN '04'   -- Cigarrillos/Tabaco 10%
        ELSE "factusCode"
      END
      WHERE "factusCode" IS NULL
    `);

    // ── 5. IdentificationType — código de documento DIAN ────────────────────
    await queryRunner.query(
      `ALTER TABLE "IdentificationType" ADD COLUMN IF NOT EXISTS "factusCode" varchar(5)`,
    );
    await queryRunner.query(`
      UPDATE "IdentificationType" SET "factusCode" = CASE
        WHEN "code" = 'CC'  THEN '13'   -- Cédula de ciudadanía
        WHEN "code" = 'NIT' THEN '31'   -- NIT
        WHEN "code" = 'CE'  THEN '22'   -- Cédula de extranjería
        WHEN "code" = 'PAS' THEN '41'   -- Pasaporte
        WHEN "code" = 'TI'  THEN '12'   -- Tarjeta de identidad
        WHEN "code" = 'TE'  THEN '21'   -- Tarjeta de extranjería
        WHEN "code" = 'RC'  THEN '11'   -- Registro civil
        ELSE "factusCode"
      END
      WHERE "factusCode" IS NULL
    `);

    // ── 6. Backfill de la configuración del emisor (independiente del UUID) ──
    //   Mono-tenant: rellena la única organización si aún no tiene config.
    //   factusNumberingRangeId 2621 es el rango sandbox; en producción, si ese
    //   id no existe en la cuenta, el servicio auto-resuelve el rango real de
    //   "Factura de Venta" (ver factus-bills.service.resolveNumberingRangeId),
    //   así que es seguro dejarlo como valor inicial.
    await queryRunner.query(`
      UPDATE "Organizational"
        SET
          "factusNumberingRangeId"      = 2621,
          "factusMunicipalityCode"      = '86001',
          "factusDv"                    = '8',
          "factusTributeCode"           = COALESCE("factusTributeCode", 'ZZ'),
          "factusLegalOrganizationCode" = COALESCE("factusLegalOrganizationCode", '1')
      WHERE "factusNumberingRangeId" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "IdentificationType" DROP COLUMN IF EXISTS "factusCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "TaxeType" DROP COLUMN IF EXISTS "factusCode"`,
    );

    await queryRunner.query(`
      ALTER TABLE "Invoice"
        DROP COLUMN IF EXISTS "factusSentAt",
        DROP COLUMN IF EXISTS "factusPublicUrl",
        DROP COLUMN IF EXISTS "factusQrCode",
        DROP COLUMN IF EXISTS "factusCufe",
        DROP COLUMN IF EXISTS "factusNumber"
    `);

    await queryRunner.query(`
      ALTER TABLE "User"
        DROP COLUMN IF EXISTS "factusLegalOrganizationCode",
        DROP COLUMN IF EXISTS "factusTributeCode",
        DROP COLUMN IF EXISTS "factusDv",
        DROP COLUMN IF EXISTS "factusMunicipalityCode",
        DROP COLUMN IF EXISTS "address"
    `);

    await queryRunner.query(`
      ALTER TABLE "Organizational"
        DROP COLUMN IF EXISTS "factusLegalOrganizationCode",
        DROP COLUMN IF EXISTS "factusTributeCode",
        DROP COLUMN IF EXISTS "factusDv",
        DROP COLUMN IF EXISTS "factusMunicipalityCode",
        DROP COLUMN IF EXISTS "factusNumberingRangeId"
    `);
  }
}
