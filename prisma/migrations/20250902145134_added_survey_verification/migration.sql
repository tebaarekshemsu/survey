/*
  Warnings:

  - The values [pending,rejected] on the enum `SurveyStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `verified` column on the `Survey` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."SurveyVerification" AS ENUM ('pending', 'accepted', 'declined');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."SurveyStatus_new" AS ENUM ('live', 'ended', 'draft');
ALTER TABLE "public"."Survey" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Survey" ALTER COLUMN "status" TYPE "public"."SurveyStatus_new" USING ("status"::text::"public"."SurveyStatus_new");
ALTER TYPE "public"."SurveyStatus" RENAME TO "SurveyStatus_old";
ALTER TYPE "public"."SurveyStatus_new" RENAME TO "SurveyStatus";
DROP TYPE "public"."SurveyStatus_old";
ALTER TABLE "public"."Survey" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Survey" ADD COLUMN     "declineReason" TEXT,
DROP COLUMN "verified",
ADD COLUMN     "verified" "public"."SurveyVerification" NOT NULL DEFAULT 'pending';
