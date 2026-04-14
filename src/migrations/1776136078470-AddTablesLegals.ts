import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTablesLegals1776136078470 implements MigrationInterface {
    name = 'AddTablesLegals1776136078470'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "LegalItemChild" ("legalItemChildId" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "order" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "legalItemId" uuid, CONSTRAINT "PK_1e42faf9343de72d15d2be868bb" PRIMARY KEY ("legalItemChildId"))`);
        await queryRunner.query(`CREATE TABLE "LegalItem" ("legalItemId" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255), "description" text, "order" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "legalSectionId" uuid, CONSTRAINT "PK_e39a6b7110579406a5101f1522a" PRIMARY KEY ("legalItemId"))`);
        await queryRunner.query(`CREATE TABLE "LegalSection" ("legalSectionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(20) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "organizationalId" uuid, CONSTRAINT "PK_b0b45ebae9f3951a5746078d4fd" PRIMARY KEY ("legalSectionId"))`);
        await queryRunner.query(`ALTER TABLE "LegalItemChild" ADD CONSTRAINT "FK_98a587b8b68692d9a43f7a797ca" FOREIGN KEY ("legalItemId") REFERENCES "LegalItem"("legalItemId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "LegalItem" ADD CONSTRAINT "FK_265dcf11fa651c7cbcbbf373bcb" FOREIGN KEY ("legalSectionId") REFERENCES "LegalSection"("legalSectionId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "LegalSection" ADD CONSTRAINT "FK_c2b2fe9bc201627e7b086986075" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "LegalSection" DROP CONSTRAINT "FK_c2b2fe9bc201627e7b086986075"`);
        await queryRunner.query(`ALTER TABLE "LegalItem" DROP CONSTRAINT "FK_265dcf11fa651c7cbcbbf373bcb"`);
        await queryRunner.query(`ALTER TABLE "LegalItemChild" DROP CONSTRAINT "FK_98a587b8b68692d9a43f7a797ca"`);
        await queryRunner.query(`DROP TABLE "LegalSection"`);
        await queryRunner.query(`DROP TABLE "LegalItem"`);
        await queryRunner.query(`DROP TABLE "LegalItemChild"`);
    }

}
