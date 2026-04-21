import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumnInTheOrg1776715216156 implements MigrationInterface {
    name = 'AddNewColumnInTheOrg1776715216156'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Organizational" ADD "howToArriveDescription" text`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('LOW_PRODUCT', 'ROOM_MAINTENANCE', 'ORDER_STATE_CHANGED')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('LOW_PRODUCT', 'ROOM_MAINTENANCE')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`ALTER TABLE "Organizational" DROP COLUMN "howToArriveDescription"`);
    }

}
