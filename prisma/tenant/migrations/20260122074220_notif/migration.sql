/*
  Warnings:

  - The values [Pending,Failed] on the enum `NotificationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `sentAt` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `type` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "NotificationEntityType" AS ENUM ('Task', 'Appointment', 'Lead', 'Student', 'Service', 'Other');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('Created', 'Updated', 'Deleted', 'StatusChanged', 'Assigned', 'Completed', 'Cancelled', 'Login', 'Logout', 'AccessDenied');

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationStatus_new" AS ENUM ('Sent', 'Read', 'Unread');
ALTER TABLE "notifications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "notifications" ALTER COLUMN "status" TYPE "NotificationStatus_new" USING ("status"::text::"NotificationStatus_new");
ALTER TYPE "NotificationStatus" RENAME TO "NotificationStatus_old";
ALTER TYPE "NotificationStatus_new" RENAME TO "NotificationStatus";
DROP TYPE "NotificationStatus_old";
ALTER TABLE "notifications" ALTER COLUMN "status" SET DEFAULT 'Sent';
COMMIT;

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropIndex
DROP INDEX "notifications_tenantId_status_idx";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "sentAt",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "readAt" TIMESTAMP(3),
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationEntityType" NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'Sent';

-- DropTable
DROP TABLE "audit_logs";

-- DropEnum
DROP TYPE "AuditAction";

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_tenantId_entityType_entityId_idx" ON "activity_logs"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "activity_logs_tenantId_userId_idx" ON "activity_logs"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "activity_logs_tenantId_timestamp_idx" ON "activity_logs"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "activity_logs_tenantId_entityType_idx" ON "activity_logs"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_status_idx" ON "notifications"("tenantId", "userId", "status");

-- CreateIndex
CREATE INDEX "notifications_tenantId_createdAt_idx" ON "notifications"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
