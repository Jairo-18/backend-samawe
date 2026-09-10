import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Completa el catálogo `IdentificationType` con los tipos de documento que la
 * DIAN reconoce y que faltaban en la base.
 *
 * Había solo cuatro (CC, NIT, CE, PAS), y eso deja fuera casos que sí aparecen:
 * un huésped con PPT o PEP —frecuentes en Putumayo—, y sobre todo los tipos que
 * el **documento soporte** exige. Ahí la DIAN no acepta cédula de ciudadanía: el
 * proveedor debe identificarse con NIT (31) o con un documento extranjero
 * (21, 22, 41, 42, 47, 50). Ver la tabla "Códigos de tipos de documentos de
 * identidad para Documentos Soporte y Notas de ajuste" en la doc de Factus.
 *
 * `factusCode` es el código que viaja en `identification_document_code`; no
 * confundir con `identificationTypeId`, que es un SERIAL local y difiere entre
 * bases.
 *
 * Idempotente: inserta por `code` solo si no existe (la tabla no tiene índice
 * único sobre `code`, así que no se puede usar `ON CONFLICT`), y rellena el
 * `factusCode` de los que ya estaban por si quedó nulo tras un re-seed.
 */
const TYPES: { code: string; factusCode: string; es: string; en: string }[] = [
  { code: 'RC', factusCode: '11', es: 'REGISTRO CIVIL', en: 'CIVIL REGISTRY' },
  {
    code: 'TI',
    factusCode: '12',
    es: 'TARJETA DE IDENTIDAD',
    en: 'IDENTITY CARD',
  },
  {
    code: 'TE',
    factusCode: '21',
    es: 'TARJETA DE EXTRANJERÍA',
    en: 'FOREIGNER CARD',
  },
  {
    code: 'DEX',
    factusCode: '42',
    es: 'DOCUMENTO DE IDENTIFICACIÓN EXTRANJERO',
    en: 'FOREIGN IDENTIFICATION DOCUMENT',
  },
  {
    code: 'PEP',
    factusCode: '47',
    es: 'PERMISO ESPECIAL DE PERMANENCIA (PEP)',
    en: 'SPECIAL STAY PERMIT (PEP)',
  },
  {
    code: 'PPT',
    factusCode: '48',
    es: 'PERMISO POR PROTECCIÓN TEMPORAL (PPT)',
    en: 'TEMPORARY PROTECTION PERMIT (PPT)',
  },
  {
    code: 'NITEX',
    factusCode: '50',
    es: 'NIT DE OTRO PAÍS',
    en: 'FOREIGN TAX ID',
  },
  { code: 'NUIP', factusCode: '91', es: 'NUIP', en: 'NUIP' },
];

// Los que ya existían: se les reafirma el factusCode por si quedó nulo.
const EXISTING: Record<string, string> = {
  CC: '13',
  NIT: '31',
  CE: '22',
  PAS: '41',
};

export class SeedIdentificationTypesDian1780200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Igual que en la migración del InvoiceType: el catálogo se sembró con ids
    // explícitos, así que la secuencia del SERIAL quedó atrás y el primer
    // INSERT chocaría con una clave ya existente. Se sincroniza primero.
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('"IdentificationType"', 'identificationTypeId'),
        GREATEST((SELECT COALESCE(MAX("identificationTypeId"), 0) FROM "IdentificationType"), 1),
        (SELECT COALESCE(MAX("identificationTypeId"), 0) FROM "IdentificationType") > 0
      )
    `);

    for (const t of TYPES) {
      await queryRunner.query(
        // Los casts explícitos son necesarios: sin ellos Postgres infiere `text`
        // para $1 en el SELECT y `varchar` en el WHERE, y aborta con
        // "inconsistent types deduced for parameter" (42P08).
        `INSERT INTO "IdentificationType" ("code", "name", "factusCode")
         SELECT $1::varchar, $2::jsonb, $3::varchar
         WHERE NOT EXISTS (
           SELECT 1 FROM "IdentificationType" WHERE "code" = $1::varchar
         )`,
        [t.code, JSON.stringify({ es: t.es, en: t.en }), t.factusCode],
      );
    }

    for (const [code, factusCode] of Object.entries(EXISTING)) {
      await queryRunner.query(
        `UPDATE "IdentificationType"
            SET "factusCode" = $2::varchar
          WHERE "code" = $1::varchar
            AND ("factusCode" IS NULL OR "factusCode" = '')`,
        [code, factusCode],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Solo se retiran los tipos nuevos que nadie esté usando: borrar uno que ya
    // quedó en un usuario rompería la FK y dejaría a esa persona sin tipo de
    // documento en facturas ya emitidas.
    for (const t of TYPES) {
      await queryRunner.query(
        `DELETE FROM "IdentificationType" it
          WHERE it."code" = $1::varchar
            AND NOT EXISTS (
              SELECT 1 FROM "User" u
               WHERE u."identificationTypeId" = it."identificationTypeId"
            )`,
        [t.code],
      );
    }
  }
}
