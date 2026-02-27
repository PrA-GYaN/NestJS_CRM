-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('Pending', 'Verified', 'Rejected', 'Expired');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('Draft', 'Submitted', 'UnderReview', 'Shortlisted', 'OfferReceived', 'Accepted', 'Rejected', 'Withdrawn');

-- CreateEnum
CREATE TYPE "StudentNotificationType" AS ENUM ('Application', 'Document', 'Visa', 'Payment', 'Appointment', 'Task', 'General', 'Message');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'OfferLetter';
ALTER TYPE "DocumentType" ADD VALUE 'AcademicDocument';
ALTER TYPE "DocumentType" ADD VALUE 'FinancialDocument';
ALTER TYPE "DocumentType" ADD VALUE 'LanguageTestResult';
ALTER TYPE "DocumentType" ADD VALUE 'RecommendationLetter';

-- AlterTable
ALTER TABLE "student_documents" ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "verificationDate" TIMESTAMP(3),
ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'Pending',
ADD COLUMN     "verifiedBy" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hashedPassword" TEXT,
ADD COLUMN     "identificationDocs" JSONB,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "password" TEXT,
ADD COLUMN     "profileCompleteness" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "course_applications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'Draft',
    "applicationDate" TIMESTAMP(3),
    "submissionDate" TIMESTAMP(3),
    "offerReceivedDate" TIMESTAMP(3),
    "offerExpiryDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "intakePeriod" TEXT,
    "applicationFee" DECIMAL(10,2),
    "offerDocumentPath" TEXT,
    "rejectionReason" TEXT,
    "notes" JSONB,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "StudentNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_applications_tenantId_idx" ON "course_applications"("tenantId");

-- CreateIndex
CREATE INDEX "course_applications_tenantId_studentId_idx" ON "course_applications"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "course_applications_tenantId_status_idx" ON "course_applications"("tenantId", "status");

-- CreateIndex
CREATE INDEX "course_applications_studentId_status_idx" ON "course_applications"("studentId", "status");

-- CreateIndex
CREATE INDEX "student_notifications_tenantId_studentId_idx" ON "student_notifications"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "student_notifications_tenantId_studentId_isRead_idx" ON "student_notifications"("tenantId", "studentId", "isRead");

-- CreateIndex
CREATE INDEX "student_notifications_studentId_createdAt_idx" ON "student_notifications"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "student_documents_tenantId_verificationStatus_idx" ON "student_documents"("tenantId", "verificationStatus");

-- CreateIndex
CREATE INDEX "students_tenantId_isActive_idx" ON "students"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "course_applications" ADD CONSTRAINT "course_applications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_applications" ADD CONSTRAINT "course_applications_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_applications" ADD CONSTRAINT "course_applications_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_notifications" ADD CONSTRAINT "student_notifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
