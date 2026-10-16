-- CreateEnum
CREATE TYPE "InstagramFormat" AS ENUM ('FEED', 'STORY');

-- CreateEnum
CREATE TYPE "InstagramPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "InstagramPostOrigin" AS ENUM ('MANUAL', 'AUTOMATION');

-- CreateTable
CREATE TABLE "InstagramPost" (
    "id" TEXT NOT NULL,
    "format" "InstagramFormat" NOT NULL,
    "imagePath" TEXT NOT NULL,
    "caption" TEXT,
    "status" "InstagramPostStatus" NOT NULL DEFAULT 'DRAFT',
    "origin" "InstagramPostOrigin" NOT NULL DEFAULT 'MANUAL',
    "scheduledAt" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMPTZ(3),
    "containerId" TEXT,
    "mediaId" TEXT,
    "permalink" TEXT,
    "accountLabel" TEXT,
    "publishedAt" TIMESTAMPTZ(3),
    "lastError" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InstagramPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstagramPost_status_scheduledAt_idx" ON "InstagramPost"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "InstagramPost_scheduledAt_idx" ON "InstagramPost"("scheduledAt");

-- AddForeignKey
ALTER TABLE "InstagramPost" ADD CONSTRAINT "InstagramPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
