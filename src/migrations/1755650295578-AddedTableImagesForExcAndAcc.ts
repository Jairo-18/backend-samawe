import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedTableImagesForExcAndAcc1755650295578 implements MigrationInterface {
    name = 'AddedTableImagesForExcAndAcc1755650295578'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "AccommodationImage" ("accommodationImageId" SERIAL NOT NULL, "imageUrl" character varying(500) NOT NULL, "publicId" character varying(255) NOT NULL, "accommodationId" integer, CONSTRAINT "PK_9ca0aca54a772746d55ed9d8a24" PRIMARY KEY ("accommodationImageId"))`);
        await queryRunner.query(`CREATE TABLE "ExcursionImage" ("excursionImageId" SERIAL NOT NULL, "imageUrl" character varying(500) NOT NULL, "publicId" character varying(255) NOT NULL, "excursionId" integer, CONSTRAINT "PK_803f2ee25c895daa76528695f7f" PRIMARY KEY ("excursionImageId"))`);
        await queryRunner.query(`CREATE TABLE "ProductImage" ("productImageId" SERIAL NOT NULL, "imageUrl" character varying(500) NOT NULL, "publicId" character varying(255) NOT NULL, "productId" integer, CONSTRAINT "PK_321b08c90c0faf1ea8e2bf5f3c5" PRIMARY KEY ("productImageId"))`);
        await queryRunner.query(`ALTER TABLE "AccommodationImage" ADD CONSTRAINT "FK_6e89cddac08d6efb4635f438420" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("accommodationId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ExcursionImage" ADD CONSTRAINT "FK_8ff701db530d1147e5d2438eef8" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("excursionId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ProductImage" ADD CONSTRAINT "FK_3d710463d5890ec9231cfc35d71" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ProductImage" DROP CONSTRAINT "FK_3d710463d5890ec9231cfc35d71"`);
        await queryRunner.query(`ALTER TABLE "ExcursionImage" DROP CONSTRAINT "FK_8ff701db530d1147e5d2438eef8"`);
        await queryRunner.query(`ALTER TABLE "AccommodationImage" DROP CONSTRAINT "FK_6e89cddac08d6efb4635f438420"`);
        await queryRunner.query(`DROP TABLE "ProductImage"`);
        await queryRunner.query(`DROP TABLE "ExcursionImage"`);
        await queryRunner.query(`DROP TABLE "AccommodationImage"`);
    }

}
