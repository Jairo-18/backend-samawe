import { MigrationInterface, QueryRunner } from "typeorm";

export class V2Database1746045132633 implements MigrationInterface {
    name = 'V2Database1746045132633'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Invoice" ("invoiceId" SERIAL NOT NULL, "name" character varying(50), "totalAmount" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "payTipeId" integer, "categoryTypeId" integer, CONSTRAINT "PK_8a887d82ac7b6a543d43508a655" PRIMARY KEY ("invoiceId"))`);
        await queryRunner.query(`CREATE TABLE "InvoiceProduct" ("invoiceProductId" SERIAL NOT NULL, "amount" integer NOT NULL, "priceSale" numeric(10,2) NOT NULL, "subtotal" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "invoiceId" integer, "productId" integer, CONSTRAINT "PK_de2a5d62d2dfc2b4d5cc581e434" PRIMARY KEY ("invoiceProductId"))`);
        await queryRunner.query(`ALTER TABLE "PayType" ADD "invoicesId" integer`);
        await queryRunner.query(`ALTER TABLE "Product" ADD "InvoiceProductId" integer`);
        await queryRunner.query(`ALTER TABLE "PayType" ADD CONSTRAINT "FK_bcff11d517e476d02e9d6c1ab99" FOREIGN KEY ("invoicesId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_e9cccddd4b2a15bc5d60c424fa1" FOREIGN KEY ("payTipeId") REFERENCES "PayType"("payTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_de6617a6cbc2e17a1ed87238c80" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceProduct" ADD CONSTRAINT "FK_c7135d5d634f7d20956a629d9c6" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceProduct" ADD CONSTRAINT "FK_ede62f5339f0eb5dfd34bef04a5" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_2ab374c390ae7ec54dc74466f40" FOREIGN KEY ("InvoiceProductId") REFERENCES "InvoiceProduct"("invoiceProductId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_2ab374c390ae7ec54dc74466f40"`);
        await queryRunner.query(`ALTER TABLE "InvoiceProduct" DROP CONSTRAINT "FK_ede62f5339f0eb5dfd34bef04a5"`);
        await queryRunner.query(`ALTER TABLE "InvoiceProduct" DROP CONSTRAINT "FK_c7135d5d634f7d20956a629d9c6"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_de6617a6cbc2e17a1ed87238c80"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_e9cccddd4b2a15bc5d60c424fa1"`);
        await queryRunner.query(`ALTER TABLE "PayType" DROP CONSTRAINT "FK_bcff11d517e476d02e9d6c1ab99"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP COLUMN "InvoiceProductId"`);
        await queryRunner.query(`ALTER TABLE "PayType" DROP COLUMN "invoicesId"`);
        await queryRunner.query(`DROP TABLE "InvoiceProduct"`);
        await queryRunner.query(`DROP TABLE "Invoice"`);
    }

}
