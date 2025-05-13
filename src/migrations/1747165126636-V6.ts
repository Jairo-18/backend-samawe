import { MigrationInterface, QueryRunner } from "typeorm";

export class V61747165126636 implements MigrationInterface {
    name = 'V61747165126636'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Product" ("productId" SERIAL NOT NULL, "code" integer NOT NULL, "name" character varying(50), "description" character varying(250), "amount" integer NOT NULL, "priceBuy" numeric(10,2) NOT NULL, "priceSale" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "categoryTypeId" integer, CONSTRAINT "PK_997722a72629b31636aadbdd789" PRIMARY KEY ("productId"))`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd"`);
        await queryRunner.query(`DROP TABLE "Product"`);
    }

}
