import { MigrationInterface, QueryRunner } from "typeorm";

export class PersonTypeTable1772631792675 implements MigrationInterface {
    name = 'PersonTypeTable1772631792675'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "PersonType" ("personTypeId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_fd73f5484e99a06697ccac902f9" PRIMARY KEY ("personTypeId"))`);
        await queryRunner.query(`ALTER TABLE "User" ADD "personTypeId" integer`);
        await queryRunner.query(`ALTER TABLE "Product" ALTER COLUMN "code" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "Product" ALTER COLUMN "name" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "Product" ALTER COLUMN "description" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ProductImage" ADD CONSTRAINT "FK_3d710463d5890ec9231cfc35d71" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Recipe" ADD CONSTRAINT "FK_553702b3ffb0b9af1cabb021027" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Recipe" ADD CONSTRAINT "FK_28a81ffe6834369ec68cf3e4cef" FOREIGN KEY ("ingredientProductId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "User" ADD CONSTRAINT "FK_c899a5ddf11248350109df0db76" FOREIGN KEY ("personTypeId") REFERENCES "PersonType"("personTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "User" DROP CONSTRAINT "FK_c899a5ddf11248350109df0db76"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606"`);
        await queryRunner.query(`ALTER TABLE "Recipe" DROP CONSTRAINT "FK_28a81ffe6834369ec68cf3e4cef"`);
        await queryRunner.query(`ALTER TABLE "Recipe" DROP CONSTRAINT "FK_553702b3ffb0b9af1cabb021027"`);
        await queryRunner.query(`ALTER TABLE "ProductImage" DROP CONSTRAINT "FK_3d710463d5890ec9231cfc35d71"`);
        await queryRunner.query(`ALTER TABLE "Product" ALTER COLUMN "description" SET DEFAULT NULL`);
        await queryRunner.query(`ALTER TABLE "Product" ALTER COLUMN "name" SET DEFAULT NULL`);
        await queryRunner.query(`ALTER TABLE "Product" ALTER COLUMN "code" SET DEFAULT NULL`);
        await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "personTypeId"`);
        await queryRunner.query(`DROP TABLE "PersonType"`);
    }

}
