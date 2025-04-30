import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameIdAndAddedColumnTaxes1746024583033 implements MigrationInterface {
    name = 'RenameIdAndAddedColumnTaxes1746024583033'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "RoleType" ("roleTypeId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_984b98dd07959da7293b45127ee" PRIMARY KEY ("roleTypeId"))`);
        await queryRunner.query(`CREATE TABLE "User" ("userId" uuid NOT NULL, "identificationNumber" character varying(25) NOT NULL, "firstName" character varying(50) NOT NULL, "lastName" character varying(50) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(25) NOT NULL, "password" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "roleTypeId" uuid, "identificationTypeId" uuid, CONSTRAINT "PK_45f0625bd8172eb9c821c948a0f" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "Product" ("productId" SERIAL NOT NULL, "name" character varying(100), "description" character varying(100), "amount" integer NOT NULL, "price" numeric(10,2) NOT NULL, "taxe" numeric(5,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "categoryTypeId" integer, "availableTypeId" integer, CONSTRAINT "PK_997722a72629b31636aadbdd789" PRIMARY KEY ("productId"))`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "FK_53a59cb597a54e64678708ae3a6" FOREIGN KEY ("roleTypeId") REFERENCES "RoleType"("roleTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "FK_4b60684d74be512dab8f840ad01" FOREIGN KEY ("identificationTypeId") REFERENCES "IdentificationType"("identificationTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_9eb95b12a8ab4ed44c5feecc1b7" FOREIGN KEY ("availableTypeId") REFERENCES "AvailableType"("availableTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_9eb95b12a8ab4ed44c5feecc1b7"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd"`);
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "FK_4b60684d74be512dab8f840ad01"`);
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "FK_53a59cb597a54e64678708ae3a6"`);
        await queryRunner.query(`DROP TABLE "Product"`);
        await queryRunner.query(`DROP TABLE "User"`);
        await queryRunner.query(`DROP TABLE "RoleType"`);
    }

}
