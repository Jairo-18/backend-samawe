import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteIngredientTable1771912464023 implements MigrationInterface {
  name = 'DeleteIngredientTable1771912464023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Recipe" DROP CONSTRAINT "FK_ce4292ea1ba3996adad7905eeaf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Recipe" RENAME COLUMN "ingredientId" TO "ingredientProductId"`,
    );

    await queryRunner.query(
      `ALTER TABLE "Recipe" ADD CONSTRAINT "FK_28a81ffe6834369ec68cf3e4cef" FOREIGN KEY ("ingredientProductId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Recipe" DROP CONSTRAINT "FK_28a81ffe6834369ec68cf3e4cef"`,
    );

    await queryRunner.query(
      `ALTER TABLE "Recipe" RENAME COLUMN "ingredientProductId" TO "ingredientId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Recipe" ADD CONSTRAINT "FK_ce4292ea1ba3996adad7905eeaf" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("ingredientId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
