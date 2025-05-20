import { MigrationInterface, QueryRunner } from "typeorm";

export class V91747757721192 implements MigrationInterface {
    name = 'V91747757721192'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Product" ("productId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "description" character varying(500), "amount" numeric(10,2) NOT NULL, "priceBuy" numeric(10,2) NOT NULL, "priceSale" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "categoryTypeId" integer, CONSTRAINT "PK_997722a72629b31636aadbdd789" PRIMARY KEY ("productId"))`);
        await queryRunner.query(`CREATE TABLE "Excursion" ("excursionId" SERIAL NOT NULL, "code" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(500), "amountPerson" integer NOT NULL, "priceBuy" numeric(10,2) NOT NULL, "priceSale" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "stateTypeId" integer, "categoryTypeId" integer, CONSTRAINT "PK_22da6e3bbd20aa76951cc506dd1" PRIMARY KEY ("excursionId"))`);
        await queryRunner.query(`CREATE TABLE "Accommodation" ("accommodationId" SERIAL NOT NULL, "code" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(500), "amountPerson" integer NOT NULL, "jacuzzi" boolean NOT NULL, "amountRoom" integer NOT NULL, "amountBathroom" integer NOT NULL, "priceBuy" numeric(10,2) NOT NULL, "priceSale" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "stateTypeId" integer, "bedTypeId" integer, "categoryTypeId" integer, CONSTRAINT "PK_ec507d32806dcf99bc50f7325de" PRIMARY KEY ("accommodationId"))`);
        await queryRunner.query(`ALTER TABLE "Product" ADD CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Excursion" ADD CONSTRAINT "FK_1b3e3d5e4e3b9ee4111a89341fb" FOREIGN KEY ("stateTypeId") REFERENCES "StateType"("stateTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Excursion" ADD CONSTRAINT "FK_b0fa8a30246c4a75c0af84085d4" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Accommodation" ADD CONSTRAINT "FK_1bd05b770f0fe8177e11e799413" FOREIGN KEY ("stateTypeId") REFERENCES "StateType"("stateTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Accommodation" ADD CONSTRAINT "FK_d55dcfa2f0dc891973026904813" FOREIGN KEY ("bedTypeId") REFERENCES "BedType"("bedTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Accommodation" ADD CONSTRAINT "FK_20a675305f82463e7e98f83012e" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "booking_accommodation" ADD CONSTRAINT "FK_e3dcb5958ad53f99161eb1dea35" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("accommodationId") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "booking_excursion" ADD CONSTRAINT "FK_6c673855e261e14607583ac0b8f" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("excursionId") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "booking_excursion" DROP CONSTRAINT "FK_6c673855e261e14607583ac0b8f"`);
        await queryRunner.query(`ALTER TABLE "booking_accommodation" DROP CONSTRAINT "FK_e3dcb5958ad53f99161eb1dea35"`);
        await queryRunner.query(`ALTER TABLE "Accommodation" DROP CONSTRAINT "FK_20a675305f82463e7e98f83012e"`);
        await queryRunner.query(`ALTER TABLE "Accommodation" DROP CONSTRAINT "FK_d55dcfa2f0dc891973026904813"`);
        await queryRunner.query(`ALTER TABLE "Accommodation" DROP CONSTRAINT "FK_1bd05b770f0fe8177e11e799413"`);
        await queryRunner.query(`ALTER TABLE "Excursion" DROP CONSTRAINT "FK_b0fa8a30246c4a75c0af84085d4"`);
        await queryRunner.query(`ALTER TABLE "Excursion" DROP CONSTRAINT "FK_1b3e3d5e4e3b9ee4111a89341fb"`);
        await queryRunner.query(`ALTER TABLE "Product" DROP CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd"`);
        await queryRunner.query(`DROP TABLE "Accommodation"`);
        await queryRunner.query(`DROP TABLE "Excursion"`);
        await queryRunner.query(`DROP TABLE "Product"`);
    }

}
