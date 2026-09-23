import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tipografía configurable por organización, al lado de los colores.
 *
 * Se guarda solo el NOMBRE de la familia ('Cinzel', 'Poppins'), nunca el valor
 * CSS completo: el front lo resuelve contra un catálogo cerrado antes de
 * aplicarlo, así que un valor que no esté en la lista se ignora en vez de
 * acabar dentro de un `style.setProperty()`.
 *
 * Las dos columnas quedan NULL a propósito. NULL significa "usa el valor por
 * defecto de `variables.scss`" (Alegreya SC + Poppins), que es exactamente lo
 * que el sitio hace hoy, así que la migración no cambia nada visible hasta que
 * alguien elija una fuente en Aplicación → Apariencia.
 */
export class AddOrganizationalFonts1780700000000 implements MigrationInterface {
  name = 'AddOrganizationalFonts1780700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Organizational"
        ADD COLUMN IF NOT EXISTS "fontTitle" character varying(60),
        ADD COLUMN IF NOT EXISTS "fontBody" character varying(60)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Organizational"
        DROP COLUMN IF EXISTS "fontTitle",
        DROP COLUMN IF EXISTS "fontBody"
    `);
  }
}
