-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TREASURER';

-- CreateEnum
CREATE TYPE "FinanceEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinanceCategory" AS ENUM ('MEMBERSHIP', 'SPONSORSHIP', 'DONATION', 'EVENT', 'OTHER_INCOME', 'REFEREE', 'FIELD', 'UNIFORM', 'EQUIPMENT', 'TRANSPORT', 'REGISTRATION', 'PLAYER_PAYMENT', 'OTHER_EXPENSE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'TRANSFER', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "FinanceSource" AS ENUM ('MANUAL', 'GATEWAY');

-- CreateEnum
CREATE TYPE "AgreementKind" AS ENUM ('SPONSORSHIP', 'DONATION');

-- CreateEnum
CREATE TYPE "DirectorStatus" AS ENUM ('ACTIVE', 'AWAY', 'ON_LEAVE', 'INACTIVE', 'DISMISSED');

-- CreateTable
CREATE TABLE "FinanceEntry" (
    "id" TEXT NOT NULL,
    "type" "FinanceEntryType" NOT NULL,
    "category" "FinanceCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "occurredOn" TIMESTAMPTZ(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "source" "FinanceSource" NOT NULL DEFAULT 'MANUAL',
    "externalReference" TEXT,
    "notes" TEXT,
    "matchId" TEXT,
    "agreementId" TEXT,
    "athleteId" TEXT,
    "competitionId" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMPTZ(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipDue" (
    "id" TEXT NOT NULL,
    "directorId" TEXT NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMPTZ(3) NOT NULL,
    "waivedAt" TIMESTAMPTZ(3),
    "waivedReason" TEXT,
    "entryId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MembershipDue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAgreement" (
    "id" TEXT NOT NULL,
    "kind" "AgreementKind" NOT NULL,
    "name" TEXT NOT NULL,
    "sponsorId" TEXT,
    "agreedCents" INTEGER NOT NULL,
    "startsOn" TIMESTAMPTZ(3),
    "endsOn" TIMESTAMPTZ(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FinanceAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Director" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "DirectorStatus" NOT NULL DEFAULT 'ACTIVE',
    "photoPath" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Director_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceEntry_externalReference_key" ON "FinanceEntry"("externalReference");

-- CreateIndex
CREATE INDEX "FinanceEntry_occurredOn_idx" ON "FinanceEntry"("occurredOn");

-- CreateIndex
CREATE INDEX "FinanceEntry_type_category_idx" ON "FinanceEntry"("type", "category");

-- CreateIndex
CREATE INDEX "FinanceEntry_matchId_idx" ON "FinanceEntry"("matchId");

-- CreateIndex
CREATE INDEX "FinanceEntry_agreementId_idx" ON "FinanceEntry"("agreementId");

-- CreateIndex
CREATE INDEX "FinanceEntry_athleteId_idx" ON "FinanceEntry"("athleteId");

-- CreateIndex
CREATE INDEX "FinanceEntry_competitionId_idx" ON "FinanceEntry"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipDue_entryId_key" ON "MembershipDue"("entryId");

-- CreateIndex
CREATE INDEX "MembershipDue_referenceMonth_idx" ON "MembershipDue"("referenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipDue_directorId_referenceMonth_key" ON "MembershipDue"("directorId", "referenceMonth");

-- CreateIndex
CREATE INDEX "FinanceAgreement_isActive_kind_idx" ON "FinanceAgreement"("isActive", "kind");

-- CreateIndex
CREATE INDEX "Director_status_name_idx" ON "Director"("status", "name");

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "FinanceAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDue" ADD CONSTRAINT "MembershipDue_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Director"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDue" ADD CONSTRAINT "MembershipDue_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAgreement" ADD CONSTRAINT "FinanceAgreement_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
