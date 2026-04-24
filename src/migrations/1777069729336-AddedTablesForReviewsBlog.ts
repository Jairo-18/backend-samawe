import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedTablesForReviewsBlog1777069729336 implements MigrationInterface {
    name = 'AddedTablesForReviewsBlog1777069729336'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ReviewReply" ("reviewReplyId" SERIAL NOT NULL, "comment" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "reviewId" integer NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_5f1501a067dac4b05ce90036cc3" PRIMARY KEY ("reviewReplyId"))`);
        await queryRunner.query(`CREATE TABLE "Review" ("reviewId" SERIAL NOT NULL, "title" character varying(255) NOT NULL, "comment" text NOT NULL, "score" numeric(2,1) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "organizationalId" uuid NOT NULL, CONSTRAINT "PK_99953c4bca2788f873a177f313a" PRIMARY KEY ("reviewId"))`);
        await queryRunner.query(`ALTER TABLE "ReviewReply" ADD CONSTRAINT "FK_e6d8cb938439d4c8adf8d670ce9" FOREIGN KEY ("reviewId") REFERENCES "Review"("reviewId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ReviewReply" ADD CONSTRAINT "FK_46689466ddb8713cdeb89f353cc" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Review" ADD CONSTRAINT "FK_0d904edee7210750be2fe4c4dba" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Review" ADD CONSTRAINT "FK_bdbc955c96203e9e9fc757dfcb1" FOREIGN KEY ("organizationalId") REFERENCES "Organizational"("organizationalId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Review" DROP CONSTRAINT "FK_bdbc955c96203e9e9fc757dfcb1"`);
        await queryRunner.query(`ALTER TABLE "Review" DROP CONSTRAINT "FK_0d904edee7210750be2fe4c4dba"`);
        await queryRunner.query(`ALTER TABLE "ReviewReply" DROP CONSTRAINT "FK_46689466ddb8713cdeb89f353cc"`);
        await queryRunner.query(`ALTER TABLE "ReviewReply" DROP CONSTRAINT "FK_e6d8cb938439d4c8adf8d670ce9"`);
        await queryRunner.query(`DROP TABLE "Review"`);
        await queryRunner.query(`DROP TABLE "ReviewReply"`);
    }

}
