import { MigrationInterface, QueryRunner } from "typeorm";

export class V3Database1746045407662 implements MigrationInterface {
    name = 'V3Database1746045407662'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "Invoice" ADD CONSTRAINT "FK_a2606dadaf493db28be41e7e45c" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Invoice" DROP CONSTRAINT "FK_a2606dadaf493db28be41e7e45c"`);
        await queryRunner.query(`ALTER TABLE "Invoice" DROP COLUMN "userId"`);
    }

}
