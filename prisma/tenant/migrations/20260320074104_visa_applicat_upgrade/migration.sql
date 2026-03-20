/*
  Warnings:

  - The `notes` column on the `visa_applications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[tenantId,courseApplicationId]` on the table `visa_applications` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `workflowId` to the `visa_applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "courseId" TEXT;

-- AlterTable
ALTER TABLE "visa_applications" ADD COLUMN     "courseApplicationId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "workflowId" TEXT NOT NULL,
ALTER COLUMN "destinationCountry" DROP NOT NULL,
DROP COLUMN "notes",
ADD COLUMN     "notes" JSONB;

-- CreateIndex
CREATE INDEX "classes_courseId_idx" ON "classes"("courseId");

-- CreateIndex
CREATE INDEX "visa_applications_tenantId_workflowId_idx" ON "visa_applications"("tenantId", "workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "visa_applications_tenantId_courseApplicationId_key" ON "visa_applications"("tenantId", "courseApplicationId");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_applications" ADD CONSTRAINT "visa_applications_courseApplicationId_fkey" FOREIGN KEY ("courseApplicationId") REFERENCES "course_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_applications" ADD CONSTRAINT "visa_applications_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "visa_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
