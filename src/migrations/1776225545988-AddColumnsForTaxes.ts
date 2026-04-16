import { MigrationInterface, QueryRunner } from "typeorm";

export class AddColumnsForTaxes1776225545988 implements MigrationInterface {
    name = 'AddColumnsForTaxes1776225545988'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Excursion" DROP CONSTRAINT "Excursion_taxeTypeId_fkey"`);
        await queryRunner.query(`ALTER TABLE "Accommodation" DROP CONSTRAINT "Accommodation_taxeTypeId_fkey"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "Product_taxeTypeId_fkey"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD "totalVat" numeric(10,2) DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD "totalIco8" numeric(10,2) DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD "totalIco5" numeric(10,2) DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "totalVat" numeric(10,2) DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "totalIco8" numeric(10,2) DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "totalIco5" numeric(10,2) DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "Excursion" ADD CONSTRAINT "FK_479cef7a4969306cb10c81d3fd9" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Accommodation" ADD CONSTRAINT "FK_cd44edc9374ad1aa3769afd78ca" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_567e78d8210408659bc52c1e97a" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_567e78d8210408659bc52c1e97a"`);
        await queryRunner.query(`ALTER TABLE "Accommodation" DROP CONSTRAINT "FK_cd44edc9374ad1aa3769afd78ca"`);
        await queryRunner.query(`ALTER TABLE "Excursion" DROP CONSTRAINT "FK_479cef7a4969306cb10c81d3fd9"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "totalIco5"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "totalIco8"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "totalVat"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP COLUMN "totalIco5"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP COLUMN "totalIco8"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP COLUMN "totalVat"`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "Product_taxeTypeId_fkey" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_taxeTypeId_fkey" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Excursion" ADD CONSTRAINT "Excursion_taxeTypeId_fkey" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
