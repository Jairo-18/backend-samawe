import { MigrationInterface, QueryRunner } from "typeorm";

export class RestaurantModuleImplement1771911177011 implements MigrationInterface {
    name = 'RestaurantModuleImplement1771911177011'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_6a0c06e2bca4bc0d716caece093"`);
        await queryRunner.query(`CREATE TABLE "IngredientComposition" ("compositionId" SERIAL NOT NULL, "quantity" numeric(10,3) NOT NULL, "notes" character varying(500), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "parentIngredientId" integer NOT NULL, "childIngredientId" integer NOT NULL, CONSTRAINT "PK_96f4b13aaf566bc24678efd5aea" PRIMARY KEY ("compositionId"))`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP COLUMN "orderTime"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP COLUMN "readyTime"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP COLUMN "servedTime"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" DROP COLUMN "stateTypeId"`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "orderTime" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "readyTime" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "servedTime" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "Ingredient" ADD "isPreparation" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "IngredientComposition" ADD CONSTRAINT "FK_f1045f478bd110430b8d78c7f27" FOREIGN KEY ("parentIngredientId") REFERENCES "Ingredient"("ingredientId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "IngredientComposition" ADD CONSTRAINT "FK_252b9810c83fabb7da7005b9929" FOREIGN KEY ("childIngredientId") REFERENCES "Ingredient"("ingredientId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "IngredientComposition" DROP CONSTRAINT "FK_252b9810c83fabb7da7005b9929"`);
        await queryRunner.query(`ALTER TABLE "IngredientComposition" DROP CONSTRAINT "FK_f1045f478bd110430b8d78c7f27"`);
        await queryRunner.query(`ALTER TABLE "Ingredient" DROP COLUMN "isPreparation"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "servedTime"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "readyTime"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "orderTime"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD "stateTypeId" integer`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD "servedTime" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD "readyTime" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD "orderTime" TIMESTAMP`);
        await queryRunner.query(`DROP TABLE "IngredientComposition"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_6a0c06e2bca4bc0d716caece093" FOREIGN KEY ("stateTypeId") REFERENCES "StateType"("stateTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
