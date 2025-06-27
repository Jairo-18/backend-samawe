import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedTableNotifications1750970810474 implements MigrationInterface {
    name = 'AddedTableNotifications1750970810474'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('LOW_PRODUCT', 'ROOM_MAINTENANCE')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("notificationId" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "message" character varying NOT NULL, "read" boolean NOT NULL DEFAULT false, "type" "public"."notifications_type_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userUserId" uuid, CONSTRAINT "PK_b39089dc8ff57d2bc507f08e52b" PRIMARY KEY ("notificationId"))`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_c5cc52b42fde832d730c437e40f" FOREIGN KEY ("userUserId") REFERENCES "User"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_c5cc52b42fde832d730c437e40f"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    }

}
