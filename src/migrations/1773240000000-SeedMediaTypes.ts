import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMediaTypes1773240000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "MediaType" ("code", "name", "allowsMultiple", "maxItems")
            VALUES 
                ('LOGO', 'Logo Principal', false, 1),
                ('LOGIN_BG', 'Imagen de Login', false, 1),
                ('REGISTER_BG', 'Imagen de Registro', false, 1)
            ON CONFLICT (code) DO NOTHING;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "MediaType" WHERE "code" IN ('LOGO', 'LOGIN_BG', 'REGISTER_BG');`,
    );
  }
}
