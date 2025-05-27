import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedNullableFalseInvoiceCode1748383541379 implements MigrationInterface {
    name = 'AddedNullableFalseInvoiceCode1748383541379'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Invoice" ("invoiceId" SERIAL NOT NULL, "code" character varying(255) NOT NULL, "subtotal" numeric(10,2) NOT NULL, "total" numeric(10,2) NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "invoiceTypeId" integer, "userId" uuid, "employeeId" uuid, "paidTypeId" integer, "payTypeId" integer, CONSTRAINT "PK_8a887d82ac7b6a543d43508a655" PRIMARY KEY ("invoiceId"))`);
        await queryRunner.query(`ALTER TABLE "PayType" ADD CONSTRAINT "FK_bcff11d517e476d02e9d6c1ab99" FOREIGN KEY ("invoicesId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_0a7017cdeb1b5c9664fc3bd411e" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
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
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_0a7017cdeb1b5c9664fc3bd411e"`);
        await queryRunner.query(`ALTER TABLE "PayType" DROP CONSTRAINT "FK_bcff11d517e476d02e9d6c1ab99"`);
        await queryRunner.query(`DROP TABLE "Invoice"`);
    }

}
