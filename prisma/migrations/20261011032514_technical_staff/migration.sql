-- CreateEnum
CREATE TYPE "TechnicalStaffRole" AS ENUM ('HEAD_COACH', 'ASSISTANT_COACH', 'PHYSICAL_TRAINER', 'GOALKEEPER_COACH', 'PHYSIOTHERAPIST', 'DOCTOR', 'NUTRITIONIST', 'PSYCHOLOGIST', 'ANALYST', 'OTHER');

-- CreateTable
CREATE TABLE "TechnicalStaff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "role" "TechnicalStaffRole" NOT NULL,
    "status" "AthleteStatus" NOT NULL DEFAULT 'ACTIVE',
    "categories" "AthleteCategory"[] DEFAULT ARRAY[]::"AthleteCategory"[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TechnicalStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalStaffSeason" (
    "technicalStaffId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalStaffSeason_pkey" PRIMARY KEY ("technicalStaffId","seasonId")
);

-- CreateIndex
CREATE INDEX "TechnicalStaff_status_isPublished_idx" ON "TechnicalStaff"("status", "isPublished");

-- AddForeignKey
ALTER TABLE "TechnicalStaffSeason" ADD CONSTRAINT "TechnicalStaffSeason_technicalStaffId_fkey" FOREIGN KEY ("technicalStaffId") REFERENCES "TechnicalStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalStaffSeason" ADD CONSTRAINT "TechnicalStaffSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
