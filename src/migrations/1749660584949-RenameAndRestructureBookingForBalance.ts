import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameAndRestructureBookingForBalance1749660584949 implements MigrationInterface {
    name = 'RenameAndRestructureBookingForBalance1749660584949'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."Balance_type_enum" AS ENUM('daily', 'weekly', 'monthly', 'yearly')`);
        await queryRunner.query(`CREATE TABLE "Balance" ("id" SERIAL NOT NULL, "type" "public"."Balance_type_enum" NOT NULL, "periodDate" date NOT NULL, "totalInvoiceSale" numeric(12,2) NOT NULL DEFAULT '0', "totalInvoiceBuy" numeric(12,2) NOT NULL DEFAULT '0', "balanceInvoice" numeric(12,2) NOT NULL DEFAULT '0', "totalProductPriceSale" numeric(12,2) NOT NULL DEFAULT '0', "totalProductPriceBuy" numeric(12,2) NOT NULL DEFAULT '0', "balanceProduct" numeric(12,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2aa37c798b86e725e0db763c993" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "Balance"`);
        await queryRunner.query(`DROP TYPE "public"."Balance_type_enum"`);
    }

}
