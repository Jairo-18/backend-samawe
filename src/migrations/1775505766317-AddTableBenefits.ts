import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTableBenefits1775505766317 implements MigrationInterface {
    name = 'AddTableBenefits1775505766317'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "BenefitItem" ("benefitItemId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "icon" character varying(100) NOT NULL, "order" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "benefitSectionId" uuid, CONSTRAINT "PK_b9ff08d4359d838e750d881cc46" PRIMARY KEY ("benefitItemId"))`);
        await queryRunner.query(`CREATE TABLE "BenefitSection" ("benefitSectionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "order" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "organizationalId" uuid, CONSTRAINT "PK_9761a62fb127bf5f51e47d94fc5" PRIMARY KEY ("benefitSectionId"))`);
        await queryRunner.query(`ALTER TABLE "BenefitItem" ADD CONSTRAINT "FK_36e16d70e17d2efe41a4be13d09" FOREIGN KEY ("benefitSectionId") REFERENCES "BenefitSection"("benefitSectionId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "BenefitSection" ADD CONSTRAINT "FK_24c3349bb6abde0444c112ac120" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "BenefitSection" DROP CONSTRAINT "FK_24c3349bb6abde0444c112ac120"`);
        await queryRunner.query(`ALTER TABLE "BenefitItem" DROP CONSTRAINT "FK_36e16d70e17d2efe41a4be13d09"`);
        await queryRunner.query(`DROP TABLE "BenefitSection"`);
        await queryRunner.query(`DROP TABLE "BenefitItem"`);
    }

}
