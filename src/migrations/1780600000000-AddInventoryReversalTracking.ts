import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deja rastro de si la reversión de inventario de una nota llegó a aplicarse.
 *
 * Hasta ahora era **best-effort mudo**: la nota crédito queda válida ante la
 * DIAN, se intenta devolver el stock y, si falla, solo quedaba una línea de
 * log. Nadie se entera de que la mercancía se acreditó al cliente pero nunca
 * volvió al inventario, y no hay forma de reintentarlo.
 *
 * ### Por qué no basta una sola bandera
 *
 * La reversión de una nota crédito tiene **dos fases** que no pueden ir en la
 * misma transacción: el stock y los estados de hospedaje van en una transacción
 * de TypeORM, pero los ingredientes de las recetas los restaura `RecipeService`
 * con su propio repositorio. Si la primera confirma y la segunda falla, un
 * reintento que lo repitiera todo **sumaría el stock dos veces** — peor que el
 * problema original.
 *
 * Por eso se guarda el progreso por fases:
 *  - `inventoryStockReversed`   → la transacción de stock/estados ya se aplicó.
 *  - `inventoryRecipesRestored` → cuántos ítems de receta van restaurados, para
 *    reanudar desde ahí y no desde el principio.
 *  - `inventoryReversed`        → todo terminado. Es por la que filtra el
 *    reintento, así que es la única que importa para no repetir trabajo.
 *
 * La nota de AJUSTE tiene el problema simétrico (descuenta stock en vez de
 * devolverlo) pero una sola fase, así que le basta una bandera.
 *
 * ### Backfill
 *
 * Las notas que ya existen se marcan como **hechas**. Es lo correcto: su
 * reversión corrió en su momento, y dejarlas en `false` haría que el reintento
 * las procesara otra vez y duplicara el stock. Si alguna hubiera fallado de
 * verdad, se corrige a mano — pero no a costa de arriesgar las que sí
 * funcionaron.
 */
export class AddInventoryReversalTracking1780600000000
  implements MigrationInterface
{
  name = 'AddInventoryReversalTracking1780600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Nota crédito: devuelve inventario ──────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "CreditNote"
        ADD COLUMN IF NOT EXISTS "inventoryReversed" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "inventoryStockReversed" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "inventoryRecipesRestored" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "inventoryReversedAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "inventoryReverseError" text
    `);

    await queryRunner.query(`
      UPDATE "CreditNote"
         SET "inventoryReversed" = true,
             "inventoryStockReversed" = true,
             "inventoryReversedAt" = "createdAt"
       WHERE "inventoryReversed" = false
    `);

    // ── Nota de ajuste: descuenta inventario (el caso simétrico) ───────────
    await queryRunner.query(`
      ALTER TABLE "AdjustmentNote"
        ADD COLUMN IF NOT EXISTS "inventoryApplied" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "inventoryAppliedAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "inventoryApplyError" text
    `);

    await queryRunner.query(`
      UPDATE "AdjustmentNote"
         SET "inventoryApplied" = true,
             "inventoryAppliedAt" = "createdAt"
       WHERE "inventoryApplied" = false
    `);

    // Índices parciales: el reintento pregunta justo por las pendientes, que
    // en condiciones normales son CERO. Un índice parcial sobre `false` ocupa
    // casi nada y evita escanear toda la tabla en cada pasada del cron.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_CreditNote_inventory_pending"
        ON "CreditNote" ("creditNoteId") WHERE "inventoryReversed" = false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_AdjustmentNote_inventory_pending"
        ON "AdjustmentNote" ("adjustmentNoteId") WHERE "inventoryApplied" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_AdjustmentNote_inventory_pending"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CreditNote_inventory_pending"`,
    );
    await queryRunner.query(`
      ALTER TABLE "AdjustmentNote"
        DROP COLUMN IF EXISTS "inventoryApplied",
        DROP COLUMN IF EXISTS "inventoryAppliedAt",
        DROP COLUMN IF EXISTS "inventoryApplyError"
    `);
    await queryRunner.query(`
      ALTER TABLE "CreditNote"
        DROP COLUMN IF EXISTS "inventoryReversed",
        DROP COLUMN IF EXISTS "inventoryStockReversed",
        DROP COLUMN IF EXISTS "inventoryRecipesRestored",
        DROP COLUMN IF EXISTS "inventoryReversedAt",
        DROP COLUMN IF EXISTS "inventoryReverseError"
    `);
  }
}
