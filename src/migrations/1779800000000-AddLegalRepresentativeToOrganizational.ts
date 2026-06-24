import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Propietario / representante legal de la organización: persona NATURAL
 * (User existente, el dueño del hotel) usada como emisor en las facturas a
 * nombre del propietario (tipo FVP). Es independiente de legalName /
 * identificationNumber, que son los datos de la jurídica (samawe).
 */
export class AddLegalRepresentativeToOrganizational1779800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Organizational"
        ADD COLUMN IF NOT EXISTS "legalRepresentativeUserId" uuid
    `);
    // FK idempotente (ADD CONSTRAINT no soporta IF NOT EXISTS).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_Organizational_legalRepresentative'
        ) THEN
          ALTER TABLE "Organizational"
            ADD CONSTRAINT "FK_Organizational_legalRepresentative"
            FOREIGN KEY ("legalRepresentativeUserId") REFERENCES "User"("userId")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Organizational"
        DROP CONSTRAINT IF EXISTS "FK_Organizational_legalRepresentative",
        DROP COLUMN IF EXISTS "legalRepresentativeUserId"
    `);
  }
}
