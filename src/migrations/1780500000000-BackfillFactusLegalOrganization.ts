import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pone en valor las dos columnas Factus del cliente, que existían desde
 * `1779100000000` pero nunca las escribió nadie:
 *
 *  - `factusLegalOrganizationCode` ('1' jurídica / '2' natural)
 *  - `factusTributeCode` ('01' responsable de IVA … 'ZZ' no aplica)
 *
 * ⚠️ **Esta migración es obligatoria antes de desplegar el cambio de
 * `buildCustomer`.** Hasta ahora el payload de Factus derivaba la organización
 * legal del tipo de documento ("NIT ⇒ jurídica") e ignoraba la columna; a
 * partir del cambio la columna es la fuente de verdad. Como TODAS las filas
 * quedaron con el default `'2'` —incluidas las empresas con NIT—, desplegar el
 * código sin este backfill mandaría a la DIAN a cada empresa como persona
 * natural, con su razón social en `names` en vez de en `company`.
 *
 * Lo que hace es justamente escribir el valor que el código venía calculando en
 * caliente, así que el comportamiento observable no cambia para nadie: a partir
 * de aquí, quien quiera el caso que antes era imposible —persona natural con
 * NIT, típico del proveedor de un documento soporte— lo elige en el formulario.
 *
 * Idempotente: solo toca filas cuyo valor no sea ya el esperado.
 */
export class BackfillFactusLegalOrganization1780500000000
  implements MigrationInterface
{
  name = 'BackfillFactusLegalOrganization1780500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Jurídica para quien se identifica con NIT (factusCode '31').
    await queryRunner.query(`
      UPDATE "User" u
         SET "factusLegalOrganizationCode" = '1'
        FROM "IdentificationType" it
       WHERE it."identificationTypeId" = u."identificationTypeId"
         AND it."factusCode" = '31'
         AND u."factusLegalOrganizationCode" IS DISTINCT FROM '1'
    `);

    // 2. Natural para todos los demás, incluidos los que no tienen tipo de
    //    documento asignado (el default histórico del sistema).
    await queryRunner.query(`
      UPDATE "User" u
         SET "factusLegalOrganizationCode" = '2'
       WHERE u."factusLegalOrganizationCode" IS DISTINCT FROM '2'
         AND NOT EXISTS (
           SELECT 1
             FROM "IdentificationType" it
            WHERE it."identificationTypeId" = u."identificationTypeId"
              AND it."factusCode" = '31'
         )
    `);

    // 3. `tribute_code`: 'ZZ' (No aplica) es el default correcto y es lo que el
    //    código enviaba para todo el mundo. Quien sea responsable de IVA se
    //    marca ahora desde el formulario, uno a uno.
    await queryRunner.query(`
      UPDATE "User"
         SET "factusTributeCode" = 'ZZ'
       WHERE "factusTributeCode" IS NULL
    `);

    // 4. `personTypeId` coherente con la organización legal. Son la misma
    //    decisión expresada dos veces y hasta ahora podían discrepar, porque
    //    una la escribía `resolvePersonType` y la otra nadie.
    //    Se resuelve por `code` ('NAT'/'JUR'), nunca por id: los `personTypeId`
    //    los asigna un SERIAL y difieren entre bases. Si el catálogo no
    //    tuviera esos codes (re-seed que los dejó en null) se salta el paso en
    //    vez de asignar un id a ciegas.
    await queryRunner.query(`
      DO $$
      DECLARE
        natural_id integer;
        juridica_id integer;
      BEGIN
        SELECT "personTypeId" INTO natural_id  FROM "PersonType" WHERE code = 'NAT' LIMIT 1;
        SELECT "personTypeId" INTO juridica_id FROM "PersonType" WHERE code = 'JUR' LIMIT 1;

        IF natural_id IS NULL OR juridica_id IS NULL THEN
          RAISE NOTICE 'PersonType sin codes NAT/JUR: se omite la sincronización de personTypeId';
          RETURN;
        END IF;

        UPDATE "User"
           SET "personTypeId" = CASE
                 WHEN "factusLegalOrganizationCode" = '1' THEN juridica_id
                 ELSE natural_id
               END
         WHERE "personTypeId" IS DISTINCT FROM CASE
                 WHEN "factusLegalOrganizationCode" = '1' THEN juridica_id
                 ELSE natural_id
               END;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // No se revierte: el estado previo era "todas las filas con el default,
    // sin que nadie lo leyera". Devolverlas a ese default borraría las
    // elecciones reales hechas desde el formulario, y el código anterior
    // ignoraba la columna de todas formas, así que revertir no arregla nada.
  }
}
