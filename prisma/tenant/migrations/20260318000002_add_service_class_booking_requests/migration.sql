-- CreateEnum
CREATE TYPE "ServiceBookingRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled');

-- CreateEnum
CREATE TYPE "ClassBookingRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled', 'Expired');

-- CreateTable
CREATE TABLE "service_booking_requests" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "ServiceBookingRequestStatus" NOT NULL DEFAULT 'Pending',
  "notes" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectedBy" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_booking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_booking_requests" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "ClassBookingRequestStatus" NOT NULL DEFAULT 'Pending',
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
  CONSTRAINT "class_booking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_booking_requests_tenantId_serviceId_status_idx" ON "service_booking_requests"("tenantId", "serviceId", "status");

-- CreateIndex
CREATE INDEX "service_booking_requests_tenantId_studentId_status_idx" ON "service_booking_requests"("tenantId", "studentId", "status");

-- CreateIndex
CREATE INDEX "service_booking_requests_tenantId_requestedAt_idx" ON "service_booking_requests"("tenantId", "requestedAt");

-- CreateIndex
CREATE INDEX "class_booking_requests_tenantId_classId_status_idx" ON "class_booking_requests"("tenantId", "classId", "status");

-- CreateIndex
CREATE INDEX "class_booking_requests_tenantId_studentId_status_idx" ON "class_booking_requests"("tenantId", "studentId", "status");

-- CreateIndex
CREATE INDEX "class_booking_requests_tenantId_reservationExpiresAt_idx" ON "class_booking_requests"("tenantId", "reservationExpiresAt");

-- CreateIndex
CREATE INDEX "class_booking_requests_tenantId_requestedAt_idx" ON "class_booking_requests"("tenantId", "requestedAt");

-- AddForeignKey
ALTER TABLE "service_booking_requests"
ADD CONSTRAINT "service_booking_requests_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_booking_requests"
ADD CONSTRAINT "service_booking_requests_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_booking_requests"
ADD CONSTRAINT "class_booking_requests_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_booking_requests"
ADD CONSTRAINT "class_booking_requests_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
