import { MigrationInterface, QueryRunner } from "typeorm";

export class V1Database1746039861277 implements MigrationInterface {
    name = 'V1Database1746039861277'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "IdentificationType" ("identificationTypeId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(75), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_36f1c9508c3ec0e8d0164935bf6" PRIMARY KEY ("identificationTypeId"))`);
        await queryRunner.query(`CREATE TABLE "RoleType" ("roleTypeId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_984b98dd07959da7293b45127ee" PRIMARY KEY ("roleTypeId"))`);
        await queryRunner.query(`CREATE TABLE "User" ("userId" uuid NOT NULL, "identificationNumber" character varying(50) NOT NULL, "firstName" character varying(50) NOT NULL, "lastName" character varying(50) NOT NULL, "email" character varying(150) NOT NULL, "phone" character varying(25) NOT NULL, "password" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "roleTypeId" uuid, "identificationTypeId" uuid, CONSTRAINT "PK_45f0625bd8172eb9c821c948a0f" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "CategoryType" ("categoryTypeId" SERIAL NOT NULL, "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_210a35c270ade338455e0100c99" PRIMARY KEY ("categoryTypeId"))`);
        await queryRunner.query(`CREATE TABLE "Product" ("productId" SERIAL NOT NULL, "name" character varying(50), "description" character varying(150), "amount" integer NOT NULL, "priceBuy" numeric(10,2) NOT NULL, "priceSale" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "taxeTypeId" integer, "categoryTypeId" integer, CONSTRAINT "PK_997722a72629b31636aadbdd789" PRIMARY KEY ("productId"))`);
        await queryRunner.query(`CREATE TABLE "TaxeType" ("taxeTypeId" SERIAL NOT NULL, "name" numeric(5,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_16862a6e25bd73100e8f200471f" PRIMARY KEY ("taxeTypeId"))`);
        await queryRunner.query(`CREATE TABLE "PayType" ("payTypeId" SERIAL NOT NULL, "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_61025c1c0177b874d8c43be8098" PRIMARY KEY ("payTypeId"))`);
        await queryRunner.query(`CREATE TABLE "PaidType" ("paidTypeId" SERIAL NOT NULL, "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_4cea6554a38095312d4588e4327" PRIMARY KEY ("paidTypeId"))`);
        await queryRunner.query(`CREATE TABLE "AdditionalType" ("additionalTypeId" SERIAL NOT NULL, "amountAdditional" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_31b489fce73f72dac4076ae2e4e" PRIMARY KEY ("additionalTypeId"))`);
        await queryRunner.query(`CREATE TABLE "AvailableType" ("availableTypeId" SERIAL NOT NULL, "name" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_16b0958ed75189266893e501611" PRIMARY KEY ("availableTypeId"))`);
        await queryRunner.query(`CREATE TABLE "Experience" ("experienceId" SERIAL NOT NULL, "name" character varying(50), "description" character varying(150), "amountPerson" integer NOT NULL, "amount" integer NOT NULL, "priceSale" numeric(10,2) NOT NULL, "checkInDate" date, "checkOutDate" date, "reservationDate" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "additionalTypeId" integer, "availableTypeId" integer, "taxeTypeId" integer, "categoryTypeId" integer, CONSTRAINT "PK_25512aa2f769e858fb8f000c895" PRIMARY KEY ("experienceId"))`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "FK_53a59cb597a54e64678708ae3a6" FOREIGN KEY ("roleTypeId") REFERENCES "RoleType"("roleTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "FK_4b60684d74be512dab8f840ad01" FOREIGN KEY ("identificationTypeId") REFERENCES "IdentificationType"("identificationTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_567e78d8210408659bc52c1e97a" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Experience" ADD CONSTRAINT "FK_94d9ad2b63b4f21ec9f56f9d353" FOREIGN KEY ("additionalTypeId") REFERENCES "AdditionalType"("additionalTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Experience" ADD CONSTRAINT "FK_9eef7ee011780c6cd6a797282ee" FOREIGN KEY ("availableTypeId") REFERENCES "AvailableType"("availableTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Experience" ADD CONSTRAINT "FK_25be2e41286129a9b40408e5b85" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Experience" ADD CONSTRAINT "FK_ae3dac4fc4f356c0e9de5aae341" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Experience" DROP CONSTRAINT "FK_ae3dac4fc4f356c0e9de5aae341"`);
        await queryRunner.query(`ALTER TABLE "Experience" DROP CONSTRAINT "FK_25be2e41286129a9b40408e5b85"`);
        await queryRunner.query(`ALTER TABLE "Experience" DROP CONSTRAINT "FK_9eef7ee011780c6cd6a797282ee"`);
        await queryRunner.query(`ALTER TABLE "Experience" DROP CONSTRAINT "FK_94d9ad2b63b4f21ec9f56f9d353"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_567e78d8210408659bc52c1e97a"`);
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "FK_4b60684d74be512dab8f840ad01"`);
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "FK_53a59cb597a54e64678708ae3a6"`);
        await queryRunner.query(`DROP TABLE "Experience"`);
        await queryRunner.query(`DROP TABLE "AvailableType"`);
        await queryRunner.query(`DROP TABLE "AdditionalType"`);
        await queryRunner.query(`DROP TABLE "PaidType"`);
        await queryRunner.query(`DROP TABLE "PayType"`);
        await queryRunner.query(`DROP TABLE "TaxeType"`);
        await queryRunner.query(`DROP TABLE "Product"`);
        await queryRunner.query(`DROP TABLE "CategoryType"`);
        await queryRunner.query(`DROP TABLE "User"`);
        await queryRunner.query(`DROP TABLE "RoleType"`);
        await queryRunner.query(`DROP TABLE "IdentificationType"`);
    }

}
