import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedImageMultiple1755634502190 implements MigrationInterface {
    name = 'AddedImageMultiple1755634502190'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "product_images" ("productImageId" SERIAL NOT NULL, "imageUrl" character varying(500) NOT NULL, "publicId" character varying(255) NOT NULL, "product_id" integer, CONSTRAINT "PK_255422bfff81f226c26515e714c" PRIMARY KEY ("productImageId"))`);
        await queryRunner.query(`ALTER TABLE "product_images" ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY ("product_id") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068"`);
        await queryRunner.query(`DROP TABLE "product_images"`);
    }

}
