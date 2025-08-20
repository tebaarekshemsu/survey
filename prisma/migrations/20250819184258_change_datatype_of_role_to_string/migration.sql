-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('user', 'creator', 'admin');

-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "metadata" JSONB;
