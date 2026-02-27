/*
  Warnings:

  - Added the required column `endTime` to the `appointments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- CreateEnum
CREATE TYPE "AppointmentRequestedBy" AS ENUM ('Student', 'Staff', 'System');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'Pending';
ALTER TYPE "AppointmentStatus" ADD VALUE 'Booked';
ALTER TYPE "AppointmentStatus" ADD VALUE 'Rejected';

-- DropIndex
DROP INDEX "appointments_tenantId_staffId_idx";

-- DropIndex
DROP INDEX "appointments_tenantId_studentId_idx";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reminder1hSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "requestedBy" "AppointmentRequestedBy" NOT NULL DEFAULT 'Student',
ADD COLUMN     "staffNotes" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "status" DROP DEFAULT;

-- CreateTable
CREATE TABLE "tenant_working_hours" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_working_hours_tenantId_isActive_idx" ON "tenant_working_hours"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "tenant_working_hours_tenantId_dayOfWeek_isOpen_idx" ON "tenant_working_hours"("tenantId", "dayOfWeek", "isOpen");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_working_hours_tenantId_dayOfWeek_key" ON "tenant_working_hours"("tenantId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "appointments_tenantId_status_idx" ON "appointments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "appointments_tenantId_studentId_status_idx" ON "appointments"("tenantId", "studentId", "status");

-- CreateIndex
CREATE INDEX "appointments_tenantId_staffId_status_idx" ON "appointments"("tenantId", "staffId", "status");

-- CreateIndex
CREATE INDEX "appointments_tenantId_staffId_scheduledAt_idx" ON "appointments"("tenantId", "staffId", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_status_scheduledAt_idx" ON "appointments"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_tenantId_status_scheduledAt_idx" ON "appointments"("tenantId", "status", "scheduledAt");
