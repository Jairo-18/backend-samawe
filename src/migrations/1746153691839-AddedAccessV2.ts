import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedAccessV21746153691839 implements MigrationInterface {
    name = 'AddedAccessV21746153691839'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "AccessSessions" ("id" uuid NOT NULL, "accessToken" character varying(2000) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, CONSTRAINT "PK_96ca2d5405462a3b5d0b1a3aa0a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "AccessSessions" ADD CONSTRAINT "FK_5305d3b88323cc2491d61f72c1c" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "AccessSessions" DROP CONSTRAINT "FK_5305d3b88323cc2491d61f72c1c"`);
        await queryRunner.query(`DROP TABLE "AccessSessions"`);
    }

}
