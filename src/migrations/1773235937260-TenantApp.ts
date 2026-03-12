import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantApp1773235937260 implements MigrationInterface {
    name = 'TenantApp1773235937260'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "MediaType" ("mediaTypeId" SERIAL NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "allowsMultiple" boolean NOT NULL DEFAULT false, "maxItems" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), CONSTRAINT "UQ_a3002d1ea9122bb6d12fef6f47d" UNIQUE ("code"), CONSTRAINT "PK_1d4080509ff1f35c7c4efc00030" PRIMARY KEY ("mediaTypeId"))`);
        await queryRunner.query(`CREATE TABLE "OrganizationalMedia" ("organizationalMediaId" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" character varying(500) NOT NULL, "label" character varying(100), "priority" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "organizationalId" uuid, "mediaTypeId" integer, CONSTRAINT "PK_b14ea8f25b6e6f122096d2927d1" PRIMARY KEY ("organizationalMediaId"))`);
        await queryRunner.query(`CREATE TABLE "Organizational" ("organizationalId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "legalName" character varying(150), "slug" character varying(100) NOT NULL, "identificationNumber" character varying(50), "email" character varying(150), "phone" character varying(25), "website" character varying(200), "address" character varying(200), "city" character varying(100), "department" character varying(100), "timezone" character varying(100), "languageDefault" character varying(10), "description" text, "primaryColor" character varying(20), "secondaryColor" character varying(20), "metaTitle" character varying(200), "metaDescription" character varying(500), "paymentEnabled" boolean NOT NULL DEFAULT false, "status" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "identificationTypeId" integer, "personTypeId" integer, "phoneCodeId" integer, CONSTRAINT "UQ_d076d74ba0435a87dbfa3234bd6" UNIQUE ("slug"), CONSTRAINT "PK_9840cc003ece7cd8a7d68b915c1" PRIMARY KEY ("organizationalId"))`);
        await queryRunner.query(`ALTER TABLE "AccommodationImage" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "ExcursionImage" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "Excursion" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "Accommodation" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "ProductImage" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "Recipe" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "Product" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "User" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "organizationalId" uuid`);
        await queryRunner.query(`ALTER TABLE "OrganizationalMedia" ADD CONSTRAINT "FK_98837d9064233a14ca1ab159650" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "OrganizationalMedia" ADD CONSTRAINT "FK_c4c696c99c22e11fda2ee18e9b6" FOREIGN KEY ("mediaTypeId") REFERENCES "MediaType"("mediaTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD CONSTRAINT "FK_6fbd873728abfee2272a4486eee" FOREIGN KEY ("identificationTypeId") REFERENCES "IdentificationType"("identificationTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD CONSTRAINT "FK_658b96fd39a869d8e4ca90a103d" FOREIGN KEY ("personTypeId") REFERENCES "PersonType"("personTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Organizational" ADD CONSTRAINT "FK_1e02f7ef6a7bca256e78898bd66" FOREIGN KEY ("phoneCodeId") REFERENCES "phone_code"("phoneCodeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "AccommodationImage" ADD CONSTRAINT "FK_0266c79453a94876d331da99a6f" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ExcursionImage" ADD CONSTRAINT "FK_c845372667c5cd98a5a0340ac9b" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Excursion" ADD CONSTRAINT "FK_b6268628813a5cae84606008ca9" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Accommodation" ADD CONSTRAINT "FK_4678f837d9f8fc61b81bb87b5bc" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ProductImage" ADD CONSTRAINT "FK_1bb7426f829f6020bba66cc2e49" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Recipe" ADD CONSTRAINT "FK_bce201c55969e608c4d97fae307" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_81c2824c6ad8a552935c22cfb01" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_70e911f2e704bdbf619831ac69d" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_900bc1afd690adc53cc818baf3b" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "FK_3f55193f08be00c560e86ad413b" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_74678c3021a6fadaea92e39c379" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_74678c3021a6fadaea92e39c379"`);
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "FK_3f55193f08be00c560e86ad413b"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_900bc1afd690adc53cc818baf3b"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_70e911f2e704bdbf619831ac69d"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_81c2824c6ad8a552935c22cfb01"`);
        await queryRunner.query(`ALTER TABLE "Recipe" DROP CONSTRAINT "FK_bce201c55969e608c4d97fae307"`);
        await queryRunner.query(`ALTER TABLE "ProductImage" DROP CONSTRAINT "FK_1bb7426f829f6020bba66cc2e49"`);
        await queryRunner.query(`ALTER TABLE "Accommodation" DROP CONSTRAINT "FK_4678f837d9f8fc61b81bb87b5bc"`);
        await queryRunner.query(`ALTER TABLE "Excursion" DROP CONSTRAINT "FK_b6268628813a5cae84606008ca9"`);
        await queryRunner.query(`ALTER TABLE "ExcursionImage" DROP CONSTRAINT "FK_c845372667c5cd98a5a0340ac9b"`);
        await queryRunner.query(`ALTER TABLE "AccommodationImage" DROP CONSTRAINT "FK_0266c79453a94876d331da99a6f"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP CONSTRAINT "FK_1e02f7ef6a7bca256e78898bd66"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP CONSTRAINT "FK_658b96fd39a869d8e4ca90a103d"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP CONSTRAINT "FK_6fbd873728abfee2272a4486eee"`);
        await queryRunner.query(`ALTER TABLE "OrganizationalMedia" DROP CONSTRAINT "FK_c4c696c99c22e11fda2ee18e9b6"`);
        await queryRunner.query(`ALTER TABLE "OrganizationalMedia" DROP CONSTRAINT "FK_98837d9064233a14ca1ab159650"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`ALTER TABLE "Recipe" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`ALTER TABLE "ProductImage" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`ALTER TABLE "Accommodation" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`ALTER TABLE "Excursion" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`ALTER TABLE "ExcursionImage" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`ALTER TABLE "AccommodationImage" DROP COLUMN "organizationalId"`);
        await queryRunner.query(`DROP TABLE "Organizational"`);
        await queryRunner.query(`DROP TABLE "OrganizationalMedia"`);
        await queryRunner.query(`DROP TABLE "MediaType"`);
    }

}
