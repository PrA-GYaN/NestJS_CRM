/*
  Warnings:

  - Added the required column `serviceId` to the `classes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceId` to the `tests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "serviceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tests" ADD COLUMN     "serviceId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "classes_tenantId_serviceId_idx" ON "classes"("tenantId", "serviceId");

-- CreateIndex
CREATE INDEX "classes_serviceId_idx" ON "classes"("serviceId");

-- CreateIndex
CREATE INDEX "tests_serviceId_idx" ON "tests"("serviceId");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
