import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hasta ahora un menú solo podía llevar platillos con receta (`MenuRecipe`):
 * `MenuService._findRecipesByProductIds` rechazaba cualquier `productId` sin
 * receta asociada. Esto bloqueaba productos normales (bebidas embotelladas,
 * souvenirs, cualquier categoría) que el staff quería poder listar en un menú
 * igual que un platillo de cocina.
 *
 * `MenuProduct` es la tabla gemela de `MenuRecipe`, pero apunta directo a
 * `Product` en vez de a `Recipe` (que exige receta). El servicio decide, por
 * cada `productId` recibido, en cuál de las dos tablas va: si tiene receta,
 * `MenuRecipe`; si no, `MenuProduct`.
 */
export class AddMenuProducts1781000000000 implements MigrationInterface {
  name = 'AddMenuProducts1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "MenuProduct" (
        "menuId" integer NOT NULL,
        "productId" integer NOT NULL,
        CONSTRAINT "PK_MenuProduct" PRIMARY KEY ("menuId", "productId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_MenuProduct_menuId" ON "MenuProduct" ("menuId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_MenuProduct_productId" ON "MenuProduct" ("productId")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "MenuProduct"
          ADD CONSTRAINT "FK_MenuProduct_menuId" FOREIGN KEY ("menuId")
          REFERENCES "Menu"("menuId") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "MenuProduct"
          ADD CONSTRAINT "FK_MenuProduct_productId" FOREIGN KEY ("productId")
          REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "MenuProduct"`);
  }
}
