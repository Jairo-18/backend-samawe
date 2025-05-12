import { MigrationInterface, QueryRunner } from "typeorm";

export class V41747075888836 implements MigrationInterface {
    name = 'V41747075888836'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "phone_code" ("phoneCodeId" SERIAL NOT NULL, "code" character varying NOT NULL, "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_41841af1954f8fc63aba9ff32dc" UNIQUE ("code"), CONSTRAINT "PK_29747600539d76778dba0df4d38" PRIMARY KEY ("phoneCodeId"))`);
        await queryRunner.query(`CREATE TABLE "IdentificationType" ("identificationTypeId" SERIAL NOT NULL, "name" character varying(75), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_36f1c9508c3ec0e8d0164935bf6" PRIMARY KEY ("identificationTypeId"))`);
        await queryRunner.query(`CREATE TABLE "RoleType" ("roleTypeId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_984b98dd07959da7293b45127ee" PRIMARY KEY ("roleTypeId"))`);
        await queryRunner.query(`CREATE TABLE "CategoryType" ("categoryTypeId" SERIAL NOT NULL, "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_210a35c270ade338455e0100c99" PRIMARY KEY ("categoryTypeId"))`);
        await queryRunner.query(`CREATE TABLE "TaxeType" ("taxeTypeId" SERIAL NOT NULL, "name" numeric(5,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_16862a6e25bd73100e8f200471f" PRIMARY KEY ("taxeTypeId"))`);
        await queryRunner.query(`CREATE TABLE "Product" ("productId" SERIAL NOT NULL, "name" character varying(50), "description" character varying(150), "amount" integer NOT NULL, "priceBuy" numeric(10,2) NOT NULL, "priceSale" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "taxeTypeId" integer, "categoryTypeId" integer, CONSTRAINT "PK_997722a72629b31636aadbdd789" PRIMARY KEY ("productId"))`);
        await queryRunner.query(`CREATE TABLE "InvoiceDetaill" ("invoiceDetaillId" SERIAL NOT NULL, "amount" integer NOT NULL, "priceSale" numeric(10,2) NOT NULL, "subtotal" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "invoiceId" integer, "productId" integer, CONSTRAINT "PK_3f16147788e1fa79a45df439710" PRIMARY KEY ("invoiceDetaillId"))`);
        await queryRunner.query(`CREATE TABLE "PayType" ("payTypeId" SERIAL NOT NULL, "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "invoicesId" integer, CONSTRAINT "PK_61025c1c0177b874d8c43be8098" PRIMARY KEY ("payTypeId"))`);
        await queryRunner.query(`CREATE TABLE "Invoice" ("invoiceId" SERIAL NOT NULL, "name" character varying(50), "totalAmount" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid, "payTipeId" integer, "categoryTypeId" integer, CONSTRAINT "PK_8a887d82ac7b6a543d43508a655" PRIMARY KEY ("invoiceId"))`);
        await queryRunner.query(`CREATE TABLE "User" ("userId" uuid NOT NULL DEFAULT uuid_generate_v4(), "identificationNumber" character varying(50) NOT NULL, "firstName" character varying(50) NOT NULL, "lastName" character varying(50) NOT NULL, "email" character varying(150) NOT NULL, "phone" character varying(25) NOT NULL, "password" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "phoneCodeId" integer, "roleTypeId" uuid, "identificationTypeId" integer, CONSTRAINT "PK_45f0625bd8172eb9c821c948a0f" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "PaidType" ("paidTypeId" SERIAL NOT NULL, "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_4cea6554a38095312d4588e4327" PRIMARY KEY ("paidTypeId"))`);
        await queryRunner.query(`CREATE TABLE "AdditionalType" ("additionalTypeId" SERIAL NOT NULL, "amountAdditional" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_31b489fce73f72dac4076ae2e4e" PRIMARY KEY ("additionalTypeId"))`);
        await queryRunner.query(`CREATE TABLE "AvailableType" ("availableTypeId" SERIAL NOT NULL, "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_16b0958ed75189266893e501611" PRIMARY KEY ("availableTypeId"))`);
        await queryRunner.query(`CREATE TABLE "Experience" ("experienceId" SERIAL NOT NULL, "name" character varying(50), "description" character varying(150), "amountPerson" integer NOT NULL, "amount" integer NOT NULL, "priceSale" numeric(10,2) NOT NULL, "checkInDate" date, "checkOutDate" date, "reservationDate" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "additionalTypeId" integer, "availableTypeId" integer, "taxeTypeId" integer, "categoryTypeId" integer, CONSTRAINT "PK_25512aa2f769e858fb8f000c895" PRIMARY KEY ("experienceId"))`);
        await queryRunner.query(`CREATE TABLE "AccessSessions" ("id" uuid NOT NULL, "accessToken" character varying(2000) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, CONSTRAINT "PK_96ca2d5405462a3b5d0b1a3aa0a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_567e78d8210408659bc52c1e97a" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_0a7017cdeb1b5c9664fc3bd411e" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "PayType" ADD CONSTRAINT "FK_bcff11d517e476d02e9d6c1ab99" FOREIGN KEY ("invoicesId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_a2606dadaf493db28be41e7e45c" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_e9cccddd4b2a15bc5d60c424fa1" FOREIGN KEY ("payTipeId") REFERENCES "PayType"("payTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_de6617a6cbc2e17a1ed87238c80" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "FK_efe6b0ecd9b81fb1520edfbc4fb" FOREIGN KEY ("phoneCodeId") REFERENCES "phone_code"("phoneCodeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "FK_53a59cb597a54e64678708ae3a6" FOREIGN KEY ("roleTypeId") REFERENCES "RoleType"("roleTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "FK_4b60684d74be512dab8f840ad01" FOREIGN KEY ("identificationTypeId") REFERENCES "IdentificationType"("identificationTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Experience" ADD CONSTRAINT "FK_94d9ad2b63b4f21ec9f56f9d353" FOREIGN KEY ("additionalTypeId") REFERENCES "AdditionalType"("additionalTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Experience" ADD CONSTRAINT "FK_9eef7ee011780c6cd6a797282ee" FOREIGN KEY ("availableTypeId") REFERENCES "AvailableType"("availableTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Experience" ADD CONSTRAINT "FK_25be2e41286129a9b40408e5b85" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Experience" ADD CONSTRAINT "FK_ae3dac4fc4f356c0e9de5aae341" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "AccessSessions" ADD CONSTRAINT "FK_5305d3b88323cc2491d61f72c1c" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "AccessSessions" DROP CONSTRAINT "FK_5305d3b88323cc2491d61f72c1c"`);
        await queryRunner.query(`ALTER TABLE "Experience" DROP CONSTRAINT "FK_ae3dac4fc4f356c0e9de5aae341"`);
        await queryRunner.query(`ALTER TABLE "Experience" DROP CONSTRAINT "FK_25be2e41286129a9b40408e5b85"`);
        await queryRunner.query(`ALTER TABLE "Experience" DROP CONSTRAINT "FK_9eef7ee011780c6cd6a797282ee"`);
        await queryRunner.query(`ALTER TABLE "Experience" DROP CONSTRAINT "FK_94d9ad2b63b4f21ec9f56f9d353"`);
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "FK_4b60684d74be512dab8f840ad01"`);
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "FK_53a59cb597a54e64678708ae3a6"`);
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "FK_efe6b0ecd9b81fb1520edfbc4fb"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_de6617a6cbc2e17a1ed87238c80"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_e9cccddd4b2a15bc5d60c424fa1"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_a2606dadaf493db28be41e7e45c"`);
        await queryRunner.query(`ALTER TABLE "PayType" DROP CONSTRAINT "FK_bcff11d517e476d02e9d6c1ab99"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_0a7017cdeb1b5c9664fc3bd411e"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_567e78d8210408659bc52c1e97a"`);
        await queryRunner.query(`DROP TABLE "AccessSessions"`);
        await queryRunner.query(`DROP TABLE "Experience"`);
        await queryRunner.query(`DROP TABLE "AvailableType"`);
        await queryRunner.query(`DROP TABLE "AdditionalType"`);
        await queryRunner.query(`DROP TABLE "PaidType"`);
        await queryRunner.query(`DROP TABLE "User"`);
        await queryRunner.query(`DROP TABLE "Invoice"`);
        await queryRunner.query(`DROP TABLE "PayType"`);
        await queryRunner.query(`DROP TABLE "InvoiceDetaill"`);
        await queryRunner.query(`DROP TABLE "Product"`);
        await queryRunner.query(`DROP TABLE "TaxeType"`);
        await queryRunner.query(`DROP TABLE "CategoryType"`);
        await queryRunner.query(`DROP TABLE "RoleType"`);
        await queryRunner.query(`DROP TABLE "IdentificationType"`);
        await queryRunner.query(`DROP TABLE "phone_code"`);
    }

}
