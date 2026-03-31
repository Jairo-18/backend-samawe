import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContentFieldsAndCorporateValueTable1774986498071 implements MigrationInterface {
    name = 'AddContentFieldsAndCorporateValueTable1774986498071'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_User_googleId"`);
        await queryRunner.query(`CREATE TABLE "CorporateValue" ("corporateValueId" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "description" text, "order" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "organizationalId" uuid, CONSTRAINT "PK_89a479da3305035ae35a53c3f33" PRIMARY KEY ("corporateValueId"))`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "tertiaryColor" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "homeTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "homeDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "experienceTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "experienceDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "reservationTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "reservationDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "aboutUsTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "aboutUsDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "missionTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "missionDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "visionTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "visionDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "historyTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "historyDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "gastronomyTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "gastronomyDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "gastronomyHistoryTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "gastronomyHistoryDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "gastronomyKitchenTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "gastronomyKitchenDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "gastronomyIngredientsTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "gastronomyIngredientsDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "accommodationsTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "accommodationsDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "howToArrivePublicTransportDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "howToArrivePrivateTransportDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "accessibilityDescription" text`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "mapsUrl" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "UQ_02dec29f4ca814ab6efa2d4f0c4" UNIQUE ("googleId")`);
        await queryRunner.query(`ALTER TABLE "CorporateValue" ADD CONSTRAINT "FK_422fd80141894dc4b4023014a6d" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "CorporateValue" DROP CONSTRAINT "FK_422fd80141894dc4b4023014a6d"`);
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "UQ_02dec29f4ca814ab6efa2d4f0c4"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "mapsUrl"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "accessibilityDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "howToArrivePrivateTransportDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "howToArrivePublicTransportDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "accommodationsDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "accommodationsTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "gastronomyIngredientsDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "gastronomyIngredientsTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "gastronomyKitchenDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "gastronomyKitchenTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "gastronomyHistoryDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "gastronomyHistoryTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "gastronomyDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "gastronomyTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "historyDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "historyTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "visionDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "visionTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "missionDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "missionTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "aboutUsDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "aboutUsTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "reservationDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "reservationTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "experienceDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "experienceTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "homeDescription"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "homeTitle"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "tertiaryColor"`);
        await queryRunner.query(`DROP TABLE "CorporateValue"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_User_googleId" ON "User" ("googleId") WHERE ("googleId" IS NOT NULL)`);
    }

}
