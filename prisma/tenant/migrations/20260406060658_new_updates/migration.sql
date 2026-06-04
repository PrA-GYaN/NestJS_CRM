-- CreateEnum
CREATE TYPE "TestBookingRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled', 'Expired');

-- AlterTable
ALTER TABLE "tests" ADD COLUMN     "reservationDurationMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "scheduledDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "visa_documents" ADD COLUMN     "studentDocumentId" TEXT,
ADD COLUMN     "workflowId" TEXT,
ALTER COLUMN "documentType" DROP NOT NULL,
ALTER COLUMN "filePath" DROP NOT NULL;

-- CreateTable
CREATE TABLE "test_booking_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "TestBookingRequestStatus" NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservationExpiresAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_booking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_booking_requests_tenantId_testId_status_idx" ON "test_booking_requests"("tenantId", "testId", "status");

-- CreateIndex
CREATE INDEX "test_booking_requests_tenantId_studentId_status_idx" ON "test_booking_requests"("tenantId", "studentId", "status");

-- CreateIndex
CREATE INDEX "test_booking_requests_tenantId_reservationExpiresAt_idx" ON "test_booking_requests"("tenantId", "reservationExpiresAt");

-- CreateIndex
CREATE INDEX "test_booking_requests_tenantId_requestedAt_idx" ON "test_booking_requests"("tenantId", "requestedAt");

-- CreateIndex
CREATE INDEX "visa_documents_tenantId_workflowId_idx" ON "visa_documents"("tenantId", "workflowId");

-- CreateIndex
CREATE INDEX "visa_documents_studentDocumentId_idx" ON "visa_documents"("studentDocumentId");

-- AddForeignKey
ALTER TABLE "test_booking_requests" ADD CONSTRAINT "test_booking_requests_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_booking_requests" ADD CONSTRAINT "test_booking_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_documents" ADD CONSTRAINT "visa_documents_studentDocumentId_fkey" FOREIGN KEY ("studentDocumentId") REFERENCES "student_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
