import { MigrationInterface, QueryRunner } from "typeorm";

export class TableUniteOfMeasure1771446642812 implements MigrationInterface {
    name = 'TableUniteOfMeasure1771446642812'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "UnitOfMeasure" ("unitOfMeasureId" SERIAL NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_7e4dd8ec6a667129ff9092e67e5" PRIMARY KEY ("unitOfMeasureId"))`);
        await queryRunner.query(`ALTER TABLE "Product" ADD "unitOfMeasureId" integer`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ALTER COLUMN "isPaid" SET DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_8e5b789bcff0b2364544e3a31e7" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure"("unitOfMeasureId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_8e5b789bcff0b2364544e3a31e7"`);
        await queryRunner.query(`ALTER TABLE "InvoiceDetaill" ALTER COLUMN "isPaid" SET DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "Product" DROP COLUMN "unitOfMeasureId"`);
        await queryRunner.query(`DROP TABLE "UnitOfMeasure"`);
    }

}
