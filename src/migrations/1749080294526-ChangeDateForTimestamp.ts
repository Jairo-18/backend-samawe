import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeDateForTimestamp1749080294526 implements MigrationInterface {
    name = 'ChangeDateForTimestamp1749080294526'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "InvoiceDetaill" ("invoiceDetailId" SERIAL NOT NULL, "amount" numeric(10,2) NOT NULL, "priceWithoutTax" numeric(10,2) NOT NULL, "priceWithTax" numeric(10,2) NOT NULL, "subtotal" numeric(10,2) NOT NULL, "startDate" TIMESTAMP, "endDate" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "invoiceId" integer, "productId" integer, "accommodationId" integer, "excursionId" integer, "taxeTypeId" integer, CONSTRAINT "PK_67423012bd6d16b68c2735eb4b5" PRIMARY KEY ("invoiceDetailId"))`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_0a7017cdeb1b5c9664fc3bd411e" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_05bdbed4cb3a8e2f8f15bccd6d5" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("accommodationId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_48c6a0a05ebe9f7a1e77b43a204" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("excursionId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_5cde995d555967b1181c14aeb65" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_5cde995d555967b1181c14aeb65"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_48c6a0a05ebe9f7a1e77b43a204"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_05bdbed4cb3a8e2f8f15bccd6d5"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_0a7017cdeb1b5c9664fc3bd411e"`);
        await queryRunner.query(`DROP TABLE "InvoiceDetaill"`);
    }

}
