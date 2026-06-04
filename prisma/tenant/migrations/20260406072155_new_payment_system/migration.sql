-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "paymentCycle" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "payments_tenantId_studentId_serviceId_paymentCycle_idx" ON "payments"("tenantId", "studentId", "serviceId", "paymentCycle");
