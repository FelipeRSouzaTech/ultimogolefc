-- AlterTable
ALTER TABLE "InstagramPost" ADD COLUMN     "userTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
