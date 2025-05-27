import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedNulleableTrueTotalSUb1748384874907 implements MigrationInterface {
    name = 'AddedNulleableTrueTotalSUb1748384874907'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "InvoiceDetaill" ("invoiceDetailId" SERIAL NOT NULL, "amount" numeric(10,2) NOT NULL, "priceWithoutTax" numeric(10,2) NOT NULL, "priceWithTax" numeric(10,2) NOT NULL, "subtotal" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "invoiceId" integer, "productId" integer, "accommodationId" integer, "excursionId" integer, "taxeTypeId" integer, CONSTRAINT "PK_67423012bd6d16b68c2735eb4b5" PRIMARY KEY ("invoiceDetailId"))`);
        await queryRunner.query(`CREATE TABLE "Invoice" ("invoiceId" SERIAL NOT NULL, "code" character varying(255) NOT NULL, "subtotal" numeric(10,2) NOT NULL DEFAULT '0', "total" numeric(10,2) NOT NULL DEFAULT '0', "startDate" date NOT NULL, "endDate" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "invoiceTypeId" integer, "userId" uuid, "employeeId" uuid, "paidTypeId" integer, "payTypeId" integer, CONSTRAINT "PK_8a887d82ac7b6a543d43508a655" PRIMARY KEY ("invoiceId"))`);
        await queryRunner.query(`ALTER TABLE "PayType" ADD CONSTRAINT "FK_bcff11d517e476d02e9d6c1ab99" FOREIGN KEY ("invoicesId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_0a7017cdeb1b5c9664fc3bd411e" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_05bdbed4cb3a8e2f8f15bccd6d5" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("accommodationId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_48c6a0a05ebe9f7a1e77b43a204" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("excursionId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_5cde995d555967b1181c14aeb65" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_73894baf4f415bd706bfb40d7c5" FOREIGN KEY ("invoiceTypeId") REFERENCES "InvoiceType"("invoiceTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_a2606dadaf493db28be41e7e45c" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_bdc12956409123f1fbcc48dd3fd" FOREIGN KEY ("employeeId") REFERENCES "User"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_bf35a910178ae13aed480799351" FOREIGN KEY ("paidTypeId") REFERENCES "PaidType"("paidTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_8d7ceb2d380b7ccd53bfce81bb5" FOREIGN KEY ("payTypeId") REFERENCES "PayType"("payTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_8d7ceb2d380b7ccd53bfce81bb5"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_bf35a910178ae13aed480799351"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_bdc12956409123f1fbcc48dd3fd"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_a2606dadaf493db28be41e7e45c"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_73894baf4f415bd706bfb40d7c5"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_5cde995d555967b1181c14aeb65"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_48c6a0a05ebe9f7a1e77b43a204"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_05bdbed4cb3a8e2f8f15bccd6d5"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_0a7017cdeb1b5c9664fc3bd411e"`);
        await queryRunner.query(`ALTER TABLE "PayType" DROP CONSTRAINT "FK_bcff11d517e476d02e9d6c1ab99"`);
        await queryRunner.query(`DROP TABLE "Invoice"`);
        await queryRunner.query(`DROP TABLE "InvoiceDetaill"`);
    }

}
