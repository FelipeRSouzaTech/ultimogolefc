-- CreateEnum
CREATE TYPE "AthleteCategory" AS ENUM ('ADULT', 'BASE_U7', 'BASE_U9', 'BASE_U11', 'BASE_U13', 'BASE_U15', 'BASE_U17', 'BASE_U20', 'VETERAN', 'MASTER', 'SUPER_MASTER', 'SIXTY');

-- AlterTable
ALTER TABLE "Athlete" ADD COLUMN     "category" "AthleteCategory" NOT NULL DEFAULT 'ADULT';

-- CreateIndex
CREATE INDEX "Athlete_category_idx" ON "Athlete"("category");
