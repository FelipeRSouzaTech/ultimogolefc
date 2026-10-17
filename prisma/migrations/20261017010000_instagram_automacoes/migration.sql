-- CreateEnum
CREATE TYPE "InstagramAutomationKind" AS ENUM ('MATCH_RESULT', 'MATCH_CALL', 'MATCH_LINEUP', 'NEWS_PUBLISHED');

-- AlterTable
ALTER TABLE "InstagramPost" ADD COLUMN     "automationKey" TEXT,
ADD COLUMN     "matchId" TEXT,
ADD COLUMN     "newsArticleId" TEXT;

-- CreateTable
CREATE TABLE "InstagramAutomation" (
    "kind" "InstagramAutomationKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledAt" TIMESTAMPTZ(3),
    "updatedById" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InstagramAutomation_pkey" PRIMARY KEY ("kind")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstagramPost_automationKey_key" ON "InstagramPost"("automationKey");

-- AddForeignKey
ALTER TABLE "InstagramPost" ADD CONSTRAINT "InstagramPost_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramPost" ADD CONSTRAINT "InstagramPost_newsArticleId_fkey" FOREIGN KEY ("newsArticleId") REFERENCES "NewsArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAutomation" ADD CONSTRAINT "InstagramAutomation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
