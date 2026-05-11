import { MigrationInterface, QueryRunner } from 'typeorm';

const TEXT_FIELDS = [
  'description',
  'homeDescription',
  'experienceDescription',
  'reservationDescription',
  'aboutUsDescription',
  'missionDescription',
  'visionDescription',
  'historyDescription',
  'gastronomyDescription',
  'gastronomyHistoryDescription',
  'gastronomyKitchenDescription',
  'gastronomyIngredientsDescription',
  'accommodationsDescription',
  'howToArriveDescription',
  'howToArrivePublicTransportDescription',
  'howToArrivePrivateTransportDescription',
  'accessibilityDescription',
  'metaDescription',
];

const VARCHAR_FIELDS = [
  'homeTitle',
  'experienceTitle',
  'reservationTitle',
  'aboutUsTitle',
  'missionTitle',
  'visionTitle',
  'historyTitle',
  'gastronomyTitle',
  'gastronomyHistoryTitle',
  'gastronomyKitchenTitle',
  'gastronomyIngredientsTitle',
  'accommodationsTitle',
  'metaTitle',
];

export class OrgContentToJsonb1778700000000 implements MigrationInterface {
  name = 'OrgContentToJsonb1778700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const field of [...TEXT_FIELDS, ...VARCHAR_FIELDS]) {
      await queryRunner.query(
        `ALTER TABLE "Organizational" ALTER COLUMN "${field}" TYPE jsonb USING CASE WHEN "${field}" IS NULL THEN NULL ELSE jsonb_build_object('es', "${field}") END`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const field of TEXT_FIELDS) {
      await queryRunner.query(
        `ALTER TABLE "Organizational" ALTER COLUMN "${field}" TYPE text USING "${field}"->>'es'`,
      );
    }
    for (const field of VARCHAR_FIELDS) {
      await queryRunner.query(
        `ALTER TABLE "Organizational" ALTER COLUMN "${field}" TYPE varchar(200) USING "${field}"->>'es'`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "Organizational" ALTER COLUMN "metaDescription" TYPE varchar(500) USING "metaDescription"->>'es'`,
    );
  }
}
