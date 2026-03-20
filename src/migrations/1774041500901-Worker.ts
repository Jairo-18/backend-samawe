import { MigrationInterface, QueryRunner } from 'typeorm';

export class Worker1774041500901 implements MigrationInterface {
  name = 'Worker1774041500901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "push_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "endpoint" text NOT NULL, "p256dh" text NOT NULL, "auth" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_757fc8f00c34f66832668dc2e53" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9c8a42b552ea8125bee461a470" ON "push_subscriptions" ("userId", "endpoint") `,
    );
    await queryRunner.query(
      `ALTER TABLE "push_subscriptions" ADD CONSTRAINT "FK_4cc061875e9eecc311a94b3e431" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "push_subscriptions" DROP CONSTRAINT "FK_4cc061875e9eecc311a94b3e431"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9c8a42b552ea8125bee461a470"`,
    );
    await queryRunner.query(`DROP TABLE "push_subscriptions"`);
  }
}
