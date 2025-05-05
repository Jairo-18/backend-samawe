import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedColumnInUserPhoneCodeAndTablePhoneCode1746404668920 implements MigrationInterface {
    name = 'AddedColumnInUserPhoneCodeAndTablePhoneCode1746404668920'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "phone_code" ("phoneCodeId" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying(50), CONSTRAINT "UQ_41841af1954f8fc63aba9ff32dc" UNIQUE ("code"), CONSTRAINT "PK_29747600539d76778dba0df4d38" PRIMARY KEY ("phoneCodeId"))`);
        await queryRunner.query(`ALTER TABLE "User" ADD "phoneCodeId" uuid`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "FK_efe6b0ecd9b81fb1520edfbc4fb" FOREIGN KEY ("phoneCodeId") REFERENCES "phone_code"("phoneCodeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "FK_efe6b0ecd9b81fb1520edfbc4fb"`);
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "phoneCodeId"`);
        await queryRunner.query(`DROP TABLE "phone_code"`);
    }

}
