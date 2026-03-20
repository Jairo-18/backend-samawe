import { MigrationInterface, QueryRunner } from "typeorm";

export class MenuTable1773936738363 implements MigrationInterface {
    name = 'MenuTable1773936738363'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Menu" ("menuId" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(500), "organizationalId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_341a0f8165ea0768bea9a009ca8" PRIMARY KEY ("menuId"))`);
        await queryRunner.query(`CREATE TABLE "MenuRecipe" ("menuId" integer NOT NULL, "recipeId" integer NOT NULL, CONSTRAINT "PK_bfbc14f6637b217c792723760b8" PRIMARY KEY ("menuId", "recipeId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_813279cf99a9a4ffd133f5888d" ON "MenuRecipe" ("menuId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0f941b91f2cb6dbdb39cbc8fe9" ON "MenuRecipe" ("recipeId") `);
        await queryRunner.query(`ALTER TABLE "Menu" ADD CONSTRAINT "FK_2d00ade0fc6a4401a0e491f909c" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "MenuRecipe" ADD CONSTRAINT "FK_813279cf99a9a4ffd133f5888d2" FOREIGN KEY ("menuId") REFERENCES "Menu"("menuId") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "MenuRecipe" ADD CONSTRAINT "FK_0f941b91f2cb6dbdb39cbc8fe9d" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("recipeId") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "MenuRecipe" DROP CONSTRAINT "FK_0f941b91f2cb6dbdb39cbc8fe9d"`);
        await queryRunner.query(`ALTER TABLE "MenuRecipe" DROP CONSTRAINT "FK_813279cf99a9a4ffd133f5888d2"`);
        await queryRunner.query(`ALTER TABLE "Menu" DROP CONSTRAINT "FK_2d00ade0fc6a4401a0e491f909c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0f941b91f2cb6dbdb39cbc8fe9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_813279cf99a9a4ffd133f5888d"`);
        await queryRunner.query(`DROP TABLE "MenuRecipe"`);
        await queryRunner.query(`DROP TABLE "Menu"`);
    }

}
