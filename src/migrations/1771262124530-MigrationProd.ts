import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationProd1771262124530 implements MigrationInterface {
  name = 'MigrationProd1771262124530';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "phone_code" ("phoneCodeId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_29747600539d76778dba0df4d38" PRIMARY KEY ("phoneCodeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "IdentificationType" ("identificationTypeId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_36f1c9508c3ec0e8d0164935bf6" PRIMARY KEY ("identificationTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "RoleType" ("roleTypeId" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_984b98dd07959da7293b45127ee" PRIMARY KEY ("roleTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "PayType" ("payTypeId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "invoicesId" integer, CONSTRAINT "PK_61025c1c0177b874d8c43be8098" PRIMARY KEY ("payTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "PaidType" ("paidTypeId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_4cea6554a38095312d4588e4327" PRIMARY KEY ("paidTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "TaxeType" ("taxeTypeId" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "percentage" double precision NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_16862a6e25bd73100e8f200471f" PRIMARY KEY ("taxeTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "AccommodationImage" ("accommodationImageId" SERIAL NOT NULL, "imageUrl" character varying(500) NOT NULL, "publicId" character varying(255) NOT NULL, "accommodationId" integer, CONSTRAINT "PK_9ca0aca54a772746d55ed9d8a24" PRIMARY KEY ("accommodationImageId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "BedType" ("bedTypeId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_d788f34a529a508189fcbded093" PRIMARY KEY ("bedTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ExcursionImage" ("excursionImageId" SERIAL NOT NULL, "imageUrl" character varying(500) NOT NULL, "publicId" character varying(255) NOT NULL, "excursionId" integer, CONSTRAINT "PK_803f2ee25c895daa76528695f7f" PRIMARY KEY ("excursionImageId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Excursion" ("excursionId" SERIAL NOT NULL, "code" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(500), "priceBuy" numeric(10,2) NOT NULL, "priceSale" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "stateTypeId" integer, "categoryTypeId" integer, CONSTRAINT "PK_22da6e3bbd20aa76951cc506dd1" PRIMARY KEY ("excursionId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "StateType" ("stateTypeId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_9e499a37c53f983ed75d5321f92" PRIMARY KEY ("stateTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Accommodation" ("accommodationId" SERIAL NOT NULL, "code" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(500), "amountPerson" integer NOT NULL, "jacuzzi" boolean NOT NULL, "amountRoom" integer NOT NULL, "amountBathroom" integer NOT NULL, "priceBuy" numeric(10,2) NOT NULL, "priceSale" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "stateTypeId" integer, "bedTypeId" integer, "categoryTypeId" integer, CONSTRAINT "PK_ec507d32806dcf99bc50f7325de" PRIMARY KEY ("accommodationId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "CategoryType" ("categoryTypeId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_210a35c270ade338455e0100c99" PRIMARY KEY ("categoryTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ProductImage" ("productImageId" SERIAL NOT NULL, "imageUrl" character varying(500) NOT NULL, "publicId" character varying(255) NOT NULL, "productId" integer, CONSTRAINT "PK_321b08c90c0faf1ea8e2bf5f3c5" PRIMARY KEY ("productImageId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Product" ("productId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "description" character varying(500), "amount" numeric(10,2) NOT NULL, "priceBuy" numeric(10,2) NOT NULL, "priceSale" numeric(10,2) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "categoryTypeId" integer, CONSTRAINT "PK_997722a72629b31636aadbdd789" PRIMARY KEY ("productId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "InvoiceDetaill" ("invoiceDetailId" SERIAL NOT NULL, "amount" numeric(10,2) NOT NULL, "priceBuy" numeric(10,2) NOT NULL, "priceWithoutTax" numeric(10,2) NOT NULL, "taxe" numeric DEFAULT '0', "priceWithTax" numeric(10,2) NOT NULL, "subtotal" numeric(10,2) NOT NULL, "startDate" TIMESTAMP, "endDate" TIMESTAMP, "orderTime" TIMESTAMP, "readyTime" TIMESTAMP, "servedTime" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "invoiceId" integer, "productId" integer, "accommodationId" integer, "excursionId" integer, "taxeTypeId" integer, "stateTypeId" integer, CONSTRAINT "PK_67423012bd6d16b68c2735eb4b5" PRIMARY KEY ("invoiceDetailId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "InvoiceType" ("invoiceTypeId" SERIAL NOT NULL, "code" character varying(255), "name" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_682a5a91973d4dc886f6e7959cf" PRIMARY KEY ("invoiceTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Invoice" ("invoiceId" SERIAL NOT NULL, "code" character varying(255) NOT NULL, "observations" character varying(500), "tableNumber" character varying(50), "invoiceElectronic" boolean NOT NULL DEFAULT false, "subtotalWithoutTax" numeric(10,2) NOT NULL DEFAULT '0', "subtotalWithTax" numeric(10,2) NOT NULL DEFAULT '0', "transfer" numeric(10,2) DEFAULT '0', "cash" numeric(10,2) DEFAULT '0', "total" numeric(10,2) NOT NULL DEFAULT '0', "startDate" date NOT NULL, "endDate" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "invoiceTypeId" integer, "userId" uuid, "employeeId" uuid, "paidTypeId" integer, "payTypeId" integer, "stateTypeId" integer, CONSTRAINT "UQ_invoice_code_per_type" UNIQUE ("code", "invoiceTypeId"), CONSTRAINT "PK_8a887d82ac7b6a543d43508a655" PRIMARY KEY ("invoiceId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "User" ("userId" uuid NOT NULL DEFAULT uuid_generate_v4(), "identificationNumber" character varying(50) NOT NULL, "firstName" character varying(50) NOT NULL, "lastName" character varying(50) NOT NULL, "email" character varying(150), "phone" character varying(25) NOT NULL, "password" character varying(255) NOT NULL, "resetToken" character varying(200), "resetTokenExpiry" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "phoneCodeId" integer, "roleTypeId" uuid, "identificationTypeId" integer, CONSTRAINT "PK_45f0625bd8172eb9c821c948a0f" PRIMARY KEY ("userId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Ingredient" ("ingredientId" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(500), "unit" character varying(50) NOT NULL, "amount" numeric(10,3) NOT NULL DEFAULT '0', "minStock" numeric(10,3) NOT NULL DEFAULT '0', "cost" numeric(10,2) NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_fdef8980cebf46974a25a9cb7da" PRIMARY KEY ("ingredientId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Recipe" ("recipeId" SERIAL NOT NULL, "quantity" numeric(10,3) NOT NULL, "notes" character varying(500), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "productId" integer NOT NULL, "ingredientId" integer NOT NULL, CONSTRAINT "PK_6925b7d7f7519403e078d0ff4e5" PRIMARY KEY ("recipeId"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('LOW_PRODUCT', 'ROOM_MAINTENANCE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("notificationId" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "message" character varying NOT NULL, "read" boolean NOT NULL DEFAULT false, "metadata" jsonb, "type" "public"."notifications_type_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userUserId" uuid, CONSTRAINT "PK_b39089dc8ff57d2bc507f08e52b" PRIMARY KEY ("notificationId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "DiscountType" ("discountTypeId" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "code" character varying(255) NOT NULL, "percent" numeric(5,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_265960d5d063f383cb5ac0103a9" PRIMARY KEY ("discountTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Balance_type_enum" AS ENUM('daily', 'weekly', 'monthly', 'yearly')`,
    );
    await queryRunner.query(
      `CREATE TABLE "Balance" ("id" SERIAL NOT NULL, "type" "public"."Balance_type_enum" NOT NULL, "periodDate" date NOT NULL, "totalInvoiceSale" numeric(12,2) NOT NULL DEFAULT '0', "totalInvoiceBuy" numeric(12,2) NOT NULL DEFAULT '0', "balanceInvoice" numeric(12,2) NOT NULL DEFAULT '0', "totalProductPriceSale" numeric(12,2) NOT NULL DEFAULT '0', "totalProductPriceBuy" numeric(12,2) NOT NULL DEFAULT '0', "balanceProduct" numeric(12,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2aa37c798b86e725e0db763c993" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b3612ca41f34192567c3129bc1" ON "Balance" ("type", "periodDate") `,
    );
    await queryRunner.query(
      `CREATE TABLE "AdditionalType" ("additionalTypeId" SERIAL NOT NULL, "code" character varying(255), "value" numeric(10,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_31b489fce73f72dac4076ae2e4e" PRIMARY KEY ("additionalTypeId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "AccessSessions" ("id" uuid NOT NULL, "accessToken" character varying(2000) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, CONSTRAINT "PK_96ca2d5405462a3b5d0b1a3aa0a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "PayType" ADD CONSTRAINT "FK_bcff11d517e476d02e9d6c1ab99" FOREIGN KEY ("invoicesId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "AccommodationImage" ADD CONSTRAINT "FK_6e89cddac08d6efb4635f438420" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("accommodationId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ExcursionImage" ADD CONSTRAINT "FK_8ff701db530d1147e5d2438eef8" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("excursionId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Excursion" ADD CONSTRAINT "FK_1b3e3d5e4e3b9ee4111a89341fb" FOREIGN KEY ("stateTypeId") REFERENCES "StateType"("stateTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Excursion" ADD CONSTRAINT "FK_b0fa8a30246c4a75c0af84085d4" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Accommodation" ADD CONSTRAINT "FK_1bd05b770f0fe8177e11e799413" FOREIGN KEY ("stateTypeId") REFERENCES "StateType"("stateTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Accommodation" ADD CONSTRAINT "FK_d55dcfa2f0dc891973026904813" FOREIGN KEY ("bedTypeId") REFERENCES "BedType"("bedTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Accommodation" ADD CONSTRAINT "FK_20a675305f82463e7e98f83012e" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProductImage" ADD CONSTRAINT "FK_3d710463d5890ec9231cfc35d71" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Product" ADD CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd" FOREIGN KEY ("categoryTypeId") REFERENCES "CategoryType"("categoryTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_0a7017cdeb1b5c9664fc3bd411e" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_05bdbed4cb3a8e2f8f15bccd6d5" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("accommodationId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_48c6a0a05ebe9f7a1e77b43a204" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("excursionId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_5cde995d555967b1181c14aeb65" FOREIGN KEY ("taxeTypeId") REFERENCES "TaxeType"("taxeTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" ADD CONSTRAINT "FK_6a0c06e2bca4bc0d716caece093" FOREIGN KEY ("stateTypeId") REFERENCES "StateType"("stateTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD CONSTRAINT "FK_73894baf4f415bd706bfb40d7c5" FOREIGN KEY ("invoiceTypeId") REFERENCES "InvoiceType"("invoiceTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD CONSTRAINT "FK_a2606dadaf493db28be41e7e45c" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD CONSTRAINT "FK_bdc12956409123f1fbcc48dd3fd" FOREIGN KEY ("employeeId") REFERENCES "User"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD CONSTRAINT "FK_bf35a910178ae13aed480799351" FOREIGN KEY ("paidTypeId") REFERENCES "PaidType"("paidTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD CONSTRAINT "FK_8d7ceb2d380b7ccd53bfce81bb5" FOREIGN KEY ("payTypeId") REFERENCES "PayType"("payTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" ADD CONSTRAINT "FK_888c9b5b358784bb3a5dba255eb" FOREIGN KEY ("stateTypeId") REFERENCES "StateType"("stateTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" ADD CONSTRAINT "FK_efe6b0ecd9b81fb1520edfbc4fb" FOREIGN KEY ("phoneCodeId") REFERENCES "phone_code"("phoneCodeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" ADD CONSTRAINT "FK_53a59cb597a54e64678708ae3a6" FOREIGN KEY ("roleTypeId") REFERENCES "RoleType"("roleTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" ADD CONSTRAINT "FK_4b60684d74be512dab8f840ad01" FOREIGN KEY ("identificationTypeId") REFERENCES "IdentificationType"("identificationTypeId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Recipe" ADD CONSTRAINT "FK_553702b3ffb0b9af1cabb021027" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Recipe" ADD CONSTRAINT "FK_ce4292ea1ba3996adad7905eeaf" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("ingredientId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_c5cc52b42fde832d730c437e40f" FOREIGN KEY ("userUserId") REFERENCES "User"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "AccessSessions" ADD CONSTRAINT "FK_5305d3b88323cc2491d61f72c1c" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "AccessSessions" DROP CONSTRAINT "FK_5305d3b88323cc2491d61f72c1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_c5cc52b42fde832d730c437e40f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Recipe" DROP CONSTRAINT "FK_ce4292ea1ba3996adad7905eeaf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Recipe" DROP CONSTRAINT "FK_553702b3ffb0b9af1cabb021027"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" DROP CONSTRAINT "FK_4b60684d74be512dab8f840ad01"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" DROP CONSTRAINT "FK_53a59cb597a54e64678708ae3a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" DROP CONSTRAINT "FK_efe6b0ecd9b81fb1520edfbc4fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP CONSTRAINT "FK_888c9b5b358784bb3a5dba255eb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP CONSTRAINT "FK_8d7ceb2d380b7ccd53bfce81bb5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP CONSTRAINT "FK_bf35a910178ae13aed480799351"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP CONSTRAINT "FK_bdc12956409123f1fbcc48dd3fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP CONSTRAINT "FK_a2606dadaf493db28be41e7e45c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Invoice" DROP CONSTRAINT "FK_73894baf4f415bd706bfb40d7c5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_6a0c06e2bca4bc0d716caece093"`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_5cde995d555967b1181c14aeb65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_48c6a0a05ebe9f7a1e77b43a204"`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_05bdbed4cb3a8e2f8f15bccd6d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_bcfb0a9a4d66209ee1ffabc8606"`,
    );
    await queryRunner.query(
      `ALTER TABLE "InvoiceDetaill" DROP CONSTRAINT "FK_0a7017cdeb1b5c9664fc3bd411e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Product" DROP CONSTRAINT "FK_10b9d612c2f1de13ceafd5b6acd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProductImage" DROP CONSTRAINT "FK_3d710463d5890ec9231cfc35d71"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Accommodation" DROP CONSTRAINT "FK_20a675305f82463e7e98f83012e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Accommodation" DROP CONSTRAINT "FK_d55dcfa2f0dc891973026904813"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Accommodation" DROP CONSTRAINT "FK_1bd05b770f0fe8177e11e799413"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Excursion" DROP CONSTRAINT "FK_b0fa8a30246c4a75c0af84085d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Excursion" DROP CONSTRAINT "FK_1b3e3d5e4e3b9ee4111a89341fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ExcursionImage" DROP CONSTRAINT "FK_8ff701db530d1147e5d2438eef8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "AccommodationImage" DROP CONSTRAINT "FK_6e89cddac08d6efb4635f438420"`,
    );
    await queryRunner.query(
      `ALTER TABLE "PayType" DROP CONSTRAINT "FK_bcff11d517e476d02e9d6c1ab99"`,
    );
    await queryRunner.query(`DROP TABLE "AccessSessions"`);
    await queryRunner.query(`DROP TABLE "AdditionalType"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b3612ca41f34192567c3129bc1"`,
    );
    await queryRunner.query(`DROP TABLE "Balance"`);
    await queryRunner.query(`DROP TYPE "public"."Balance_type_enum"`);
    await queryRunner.query(`DROP TABLE "DiscountType"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP TABLE "Recipe"`);
    await queryRunner.query(`DROP TABLE "Ingredient"`);
    await queryRunner.query(`DROP TABLE "User"`);
    await queryRunner.query(`DROP TABLE "Invoice"`);
    await queryRunner.query(`DROP TABLE "InvoiceType"`);
    await queryRunner.query(`DROP TABLE "InvoiceDetaill"`);
    await queryRunner.query(`DROP TABLE "Product"`);
    await queryRunner.query(`DROP TABLE "ProductImage"`);
    await queryRunner.query(`DROP TABLE "CategoryType"`);
    await queryRunner.query(`DROP TABLE "Accommodation"`);
    await queryRunner.query(`DROP TABLE "StateType"`);
    await queryRunner.query(`DROP TABLE "Excursion"`);
    await queryRunner.query(`DROP TABLE "ExcursionImage"`);
    await queryRunner.query(`DROP TABLE "BedType"`);
    await queryRunner.query(`DROP TABLE "AccommodationImage"`);
    await queryRunner.query(`DROP TABLE "TaxeType"`);
    await queryRunner.query(`DROP TABLE "PaidType"`);
    await queryRunner.query(`DROP TABLE "PayType"`);
    await queryRunner.query(`DROP TABLE "RoleType"`);
    await queryRunner.query(`DROP TABLE "IdentificationType"`);
    await queryRunner.query(`DROP TABLE "phone_code"`);
  }
}
