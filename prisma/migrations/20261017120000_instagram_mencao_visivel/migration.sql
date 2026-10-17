-- AlterTable
ALTER TABLE "InstagramPost" ADD COLUMN     "publishImagePath" TEXT,
ADD COLUMN     "showTagsOnImage" BOOLEAN NOT NULL DEFAULT true;
