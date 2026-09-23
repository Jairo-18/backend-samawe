import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Colores del MODO OSCURO, configurables como ya lo eran los del modo claro.
 *
 * Solo se guardan los de **superficie y texto**, que son los que cambian entre
 * un modo y otro. Los de marca (primario, secundario, terciario) no se
 * duplican a propósito: son identidad del hotel y se mantienen iguales en los
 * dos modos. Lo único que hace el modo oscuro con ellos es aclararlos para que
 * contrasten, y eso se calcula solo con `color-mix`.
 *
 * Las cinco columnas quedan NULL. NULL significa "usa el valor por defecto de
 * `variables.scss`", que es exactamente lo que se ve hoy, así que la migración
 * no cambia nada hasta que alguien elija un color en Apariencia.
 */
export class AddOrganizationalDarkColors1780800000000
  implements MigrationInterface
{
  name = 'AddOrganizationalDarkColors1780800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Organizational"
        ADD COLUMN IF NOT EXISTS "darkTitleColor" character varying(20),
        ADD COLUMN IF NOT EXISTS "darkSubtitleColor" character varying(20),
        ADD COLUMN IF NOT EXISTS "darkTextColor" character varying(20),
        ADD COLUMN IF NOT EXISTS "darkBgPrimaryColor" character varying(20),
        ADD COLUMN IF NOT EXISTS "darkBgSecondaryColor" character varying(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Organizational"
        DROP COLUMN IF EXISTS "darkTitleColor",
        DROP COLUMN IF EXISTS "darkSubtitleColor",
        DROP COLUMN IF EXISTS "darkTextColor",
        DROP COLUMN IF EXISTS "darkBgPrimaryColor",
        DROP COLUMN IF EXISTS "darkBgSecondaryColor"
    `);
  }
}
