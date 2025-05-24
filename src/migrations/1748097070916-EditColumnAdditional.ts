import { MigrationInterface, QueryRunner } from "typeorm";

export class EditColumnAdditional1748097070916 implements MigrationInterface {
    name = 'EditColumnAdditional1748097070916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "AdditionalType" ("additionalTypeId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_31b489fce73f72dac4076ae2e4e" PRIMARY KEY ("additionalTypeId"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "AdditionalType"`);
    }

}
