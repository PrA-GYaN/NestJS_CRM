-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "reservationDurationMinutes" INTEGER NOT NULL DEFAULT 15;

-- CreateIndex
CREATE INDEX "class_booking_requests_tenantId_status_reservationExpiresAt_idx" ON "class_booking_requests"("tenantId", "status", "reservationExpiresAt");

-- CreateIndex
CREATE INDEX "test_booking_requests_tenantId_status_reservationExpiresAt_idx" ON "test_booking_requests"("tenantId", "status", "reservationExpiresAt");
