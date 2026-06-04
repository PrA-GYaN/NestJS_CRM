/*
  Warnings:

  - A unique constraint covering the columns `[currentVersionId]` on the table `visa_workflows` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `workflowVersionId` to the `visa_applications` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkflowVersionStatus" AS ENUM ('Draft', 'Active', 'Deprecated', 'Archived');

-- CreateEnum
CREATE TYPE "MigrationStrategy" AS ENUM ('KeepCurrentStep', 'RemapStep', 'ForcedUpdate');

-- AlterTable
ALTER TABLE "visa_applications" ADD COLUMN     "workflowVersionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "visa_workflows" ADD COLUMN     "currentVersionId" TEXT;

-- CreateTable
CREATE TABLE "visa_workflow_versions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "WorkflowVersionStatus" NOT NULL DEFAULT 'Draft',
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deprecatedAt" TIMESTAMP(3),
    "deprecatedReason" TEXT,

    CONSTRAINT "visa_workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visa_workflow_version_steps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stepOrder" INTEGER NOT NULL,
    "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expectedDurationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visa_workflow_version_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_mappings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromStepId" TEXT NOT NULL,
    "toStepId" TEXT NOT NULL,
    "isCompatible" BOOLEAN NOT NULL DEFAULT true,
    "mappingReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_version_migrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "fromVersionId" TEXT NOT NULL,
    "toVersionId" TEXT NOT NULL,
    "strategy" "MigrationStrategy" NOT NULL DEFAULT 'KeepCurrentStep',
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "workflow_version_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_migration_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "migrationId" TEXT NOT NULL,
    "fromVersionId" TEXT NOT NULL,
    "toVersionId" TEXT NOT NULL,
    "fromStepId" TEXT,
    "toStepId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "errorMessage" TEXT,
    "migratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_migration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_version_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeDetails" JSONB NOT NULL,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_version_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visa_workflow_versions_tenantId_idx" ON "visa_workflow_versions"("tenantId");

-- CreateIndex
CREATE INDEX "visa_workflow_versions_tenantId_workflowId_idx" ON "visa_workflow_versions"("tenantId", "workflowId");

-- CreateIndex
CREATE INDEX "visa_workflow_versions_workflowId_status_idx" ON "visa_workflow_versions"("workflowId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "visa_workflow_versions_workflowId_versionNumber_key" ON "visa_workflow_versions"("workflowId", "versionNumber");

-- CreateIndex
CREATE INDEX "visa_workflow_version_steps_tenantId_idx" ON "visa_workflow_version_steps"("tenantId");

-- CreateIndex
CREATE INDEX "visa_workflow_version_steps_tenantId_versionId_idx" ON "visa_workflow_version_steps"("tenantId", "versionId");

-- CreateIndex
CREATE INDEX "visa_workflow_version_steps_versionId_idx" ON "visa_workflow_version_steps"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "visa_workflow_version_steps_versionId_stepOrder_key" ON "visa_workflow_version_steps"("versionId", "stepOrder");

-- CreateIndex
CREATE INDEX "step_mappings_tenantId_idx" ON "step_mappings"("tenantId");

-- CreateIndex
CREATE INDEX "step_mappings_fromStepId_idx" ON "step_mappings"("fromStepId");

-- CreateIndex
CREATE INDEX "step_mappings_toStepId_idx" ON "step_mappings"("toStepId");

-- CreateIndex
CREATE UNIQUE INDEX "step_mappings_fromStepId_toStepId_key" ON "step_mappings"("fromStepId", "toStepId");

-- CreateIndex
CREATE INDEX "workflow_version_migrations_tenantId_idx" ON "workflow_version_migrations"("tenantId");

-- CreateIndex
CREATE INDEX "workflow_version_migrations_workflowId_idx" ON "workflow_version_migrations"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_version_migrations_fromVersionId_idx" ON "workflow_version_migrations"("fromVersionId");

-- CreateIndex
CREATE INDEX "workflow_version_migrations_toVersionId_idx" ON "workflow_version_migrations"("toVersionId");

-- CreateIndex
CREATE INDEX "application_migration_logs_tenantId_idx" ON "application_migration_logs"("tenantId");

-- CreateIndex
CREATE INDEX "application_migration_logs_applicationId_idx" ON "application_migration_logs"("applicationId");

-- CreateIndex
CREATE INDEX "application_migration_logs_migrationId_idx" ON "application_migration_logs"("migrationId");

-- CreateIndex
CREATE INDEX "workflow_version_history_tenantId_idx" ON "workflow_version_history"("tenantId");

-- CreateIndex
CREATE INDEX "workflow_version_history_versionId_idx" ON "workflow_version_history"("versionId");

-- CreateIndex
CREATE INDEX "visa_applications_tenantId_workflowVersionId_idx" ON "visa_applications"("tenantId", "workflowVersionId");

-- CreateIndex
CREATE INDEX "visa_applications_workflowVersionId_idx" ON "visa_applications"("workflowVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "visa_workflows_currentVersionId_key" ON "visa_workflows"("currentVersionId");

-- AddForeignKey
ALTER TABLE "visa_workflows" ADD CONSTRAINT "visa_workflows_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "visa_workflow_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_workflow_versions" ADD CONSTRAINT "visa_workflow_versions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "visa_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_workflow_version_steps" ADD CONSTRAINT "visa_workflow_version_steps_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "visa_workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_mappings" ADD CONSTRAINT "step_mappings_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "visa_workflow_version_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_mappings" ADD CONSTRAINT "step_mappings_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "visa_workflow_version_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_version_migrations" ADD CONSTRAINT "workflow_version_migrations_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "visa_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_version_migrations" ADD CONSTRAINT "workflow_version_migrations_fromVersionId_fkey" FOREIGN KEY ("fromVersionId") REFERENCES "visa_workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_version_migrations" ADD CONSTRAINT "workflow_version_migrations_toVersionId_fkey" FOREIGN KEY ("toVersionId") REFERENCES "visa_workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_migration_logs" ADD CONSTRAINT "application_migration_logs_migrationId_fkey" FOREIGN KEY ("migrationId") REFERENCES "workflow_version_migrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_version_history" ADD CONSTRAINT "workflow_version_history_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "visa_workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_applications" ADD CONSTRAINT "visa_applications_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "visa_workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
