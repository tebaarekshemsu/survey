/*
  Warnings:

  - The values [funding,withdrawal] on the enum `PaymentType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `totalEarn` to the `Wallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalSpend` to the `Wallet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PaymentType_new" AS ENUM ('fund', 'withdraw', 'subscribe', 'refund');
ALTER TABLE "public"."Payment" ALTER COLUMN "type" TYPE "public"."PaymentType_new" USING ("type"::text::"public"."PaymentType_new");
ALTER TYPE "public"."PaymentType" RENAME TO "PaymentType_old";
ALTER TYPE "public"."PaymentType_new" RENAME TO "PaymentType";
DROP TYPE "public"."PaymentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."Wallet" ADD COLUMN     "totalEarn" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalSpend" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "public"."Response" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "maxSurvey" TEXT NOT NULL,
    "timePeriod" INTEGER NOT NULL,
    "refundPeriod" INTEGER NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "plan" TEXT NOT NULL,
    "usage" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Response" ADD CONSTRAINT "Response_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Response" ADD CONSTRAINT "Response_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_plan_fkey" FOREIGN KEY ("plan") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
