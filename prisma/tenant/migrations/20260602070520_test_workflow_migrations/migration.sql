/*
  Warnings:

  - The values [Archived] on the enum `WorkflowVersionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WorkflowVersionStatus_new" AS ENUM ('Draft', 'Active', 'Deprecated');
ALTER TABLE "visa_workflow_versions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "visa_workflow_versions" ALTER COLUMN "status" TYPE "WorkflowVersionStatus_new" USING ("status"::text::"WorkflowVersionStatus_new");
ALTER TYPE "WorkflowVersionStatus" RENAME TO "WorkflowVersionStatus_old";
ALTER TYPE "WorkflowVersionStatus_new" RENAME TO "WorkflowVersionStatus";
DROP TYPE "WorkflowVersionStatus_old";
ALTER TABLE "visa_workflow_versions" ALTER COLUMN "status" SET DEFAULT 'Draft';
COMMIT;

-- AlterTable
ALTER TABLE "visa_workflow_versions" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "visa_workflow_versions_workflowId_deletedAt_idx" ON "visa_workflow_versions"("workflowId", "deletedAt");

-- CreateIndex
CREATE INDEX "workflow_version_history_versionId_createdAt_idx" ON "workflow_version_history"("versionId", "createdAt");

-- AddForeignKey
ALTER TABLE "application_migration_logs" ADD CONSTRAINT "application_migration_logs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "visa_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
