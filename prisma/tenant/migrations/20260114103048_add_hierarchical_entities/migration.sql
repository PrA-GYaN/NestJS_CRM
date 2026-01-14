/*
  Warnings:

  - You are about to drop the column `country` on the `universities` table. All the data in the column will be lost.
  - Added the required column `tenantId` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `student_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `countryId` to the `universities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `universities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `visa_applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visaTypeId` to the `visa_applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `visa_documents` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('StudentDocument', 'VisaDocument', 'CourseDocument', 'General');

-- DropIndex
DROP INDEX "universities_country_idx";

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "duration" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "student_documents" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "universities" DROP COLUMN "country",
ADD COLUMN     "countryId" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "visa_applications" ADD COLUMN     "currentStepId" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "visaTypeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "visa_documents" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visa_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visa_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visa_workflows" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visaTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visa_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visa_workflow_steps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stepOrder" INTEGER NOT NULL,
    "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expectedDurationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visa_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_uploads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT,
    "visaApplicationId" TEXT,
    "courseId" TEXT,
    "category" "FileCategory" NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "countries_tenantId_idx" ON "countries"("tenantId");

-- CreateIndex
CREATE INDEX "countries_tenantId_isActive_idx" ON "countries"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "countries_tenantId_code_key" ON "countries"("tenantId", "code");

-- CreateIndex
CREATE INDEX "visa_types_tenantId_idx" ON "visa_types"("tenantId");

-- CreateIndex
CREATE INDEX "visa_types_tenantId_countryId_idx" ON "visa_types"("tenantId", "countryId");

-- CreateIndex
CREATE INDEX "visa_types_countryId_idx" ON "visa_types"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "visa_types_tenantId_countryId_name_key" ON "visa_types"("tenantId", "countryId", "name");

-- CreateIndex
CREATE INDEX "visa_workflows_tenantId_idx" ON "visa_workflows"("tenantId");

-- CreateIndex
CREATE INDEX "visa_workflows_tenantId_visaTypeId_idx" ON "visa_workflows"("tenantId", "visaTypeId");

-- CreateIndex
CREATE INDEX "visa_workflows_visaTypeId_idx" ON "visa_workflows"("visaTypeId");

-- CreateIndex
CREATE INDEX "visa_workflow_steps_tenantId_idx" ON "visa_workflow_steps"("tenantId");

-- CreateIndex
CREATE INDEX "visa_workflow_steps_tenantId_workflowId_idx" ON "visa_workflow_steps"("tenantId", "workflowId");

-- CreateIndex
CREATE INDEX "visa_workflow_steps_workflowId_idx" ON "visa_workflow_steps"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "visa_workflow_steps_workflowId_stepOrder_key" ON "visa_workflow_steps"("workflowId", "stepOrder");

-- CreateIndex
CREATE INDEX "file_uploads_tenantId_idx" ON "file_uploads"("tenantId");

-- CreateIndex
CREATE INDEX "file_uploads_tenantId_studentId_idx" ON "file_uploads"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "file_uploads_tenantId_visaApplicationId_idx" ON "file_uploads"("tenantId", "visaApplicationId");

-- CreateIndex
CREATE INDEX "file_uploads_tenantId_category_idx" ON "file_uploads"("tenantId", "category");

-- CreateIndex
CREATE INDEX "courses_tenantId_idx" ON "courses"("tenantId");

-- CreateIndex
CREATE INDEX "courses_tenantId_universityId_idx" ON "courses"("tenantId", "universityId");

-- CreateIndex
CREATE INDEX "student_documents_tenantId_idx" ON "student_documents"("tenantId");

-- CreateIndex
CREATE INDEX "student_documents_tenantId_studentId_idx" ON "student_documents"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "universities_tenantId_idx" ON "universities"("tenantId");

-- CreateIndex
CREATE INDEX "universities_tenantId_countryId_idx" ON "universities"("tenantId", "countryId");

-- CreateIndex
CREATE INDEX "universities_countryId_idx" ON "universities"("countryId");

-- CreateIndex
CREATE INDEX "visa_applications_tenantId_idx" ON "visa_applications"("tenantId");

-- CreateIndex
CREATE INDEX "visa_applications_tenantId_studentId_idx" ON "visa_applications"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "visa_applications_tenantId_visaTypeId_idx" ON "visa_applications"("tenantId", "visaTypeId");

-- CreateIndex
CREATE INDEX "visa_applications_visaTypeId_idx" ON "visa_applications"("visaTypeId");

-- CreateIndex
CREATE INDEX "visa_documents_tenantId_idx" ON "visa_documents"("tenantId");

-- CreateIndex
CREATE INDEX "visa_documents_tenantId_visaApplicationId_idx" ON "visa_documents"("tenantId", "visaApplicationId");

-- AddForeignKey
ALTER TABLE "universities" ADD CONSTRAINT "universities_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_types" ADD CONSTRAINT "visa_types_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_workflows" ADD CONSTRAINT "visa_workflows_visaTypeId_fkey" FOREIGN KEY ("visaTypeId") REFERENCES "visa_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_workflow_steps" ADD CONSTRAINT "visa_workflow_steps_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "visa_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_applications" ADD CONSTRAINT "visa_applications_visaTypeId_fkey" FOREIGN KEY ("visaTypeId") REFERENCES "visa_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
