-- AlterEnum
ALTER TYPE "FinanceCategory" ADD VALUE 'STAFF_PAYMENT';

-- AlterTable
ALTER TABLE "FinanceEntry" ADD COLUMN     "payrollService" TEXT,
ADD COLUMN     "technicalStaffId" TEXT;

-- CreateIndex
CREATE INDEX "FinanceEntry_technicalStaffId_idx" ON "FinanceEntry"("technicalStaffId");

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_technicalStaffId_fkey" FOREIGN KEY ("technicalStaffId") REFERENCES "TechnicalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
