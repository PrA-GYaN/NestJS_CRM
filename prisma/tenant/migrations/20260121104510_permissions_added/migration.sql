/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,name]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `action` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `role_permissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ACCESS_DENIED';

-- DropIndex
DROP INDEX "permissions_name_key";

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "module" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "role_permissions" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "permissions_tenantId_idx" ON "permissions"("tenantId");

-- CreateIndex
CREATE INDEX "permissions_tenantId_module_idx" ON "permissions"("tenantId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_tenantId_name_key" ON "permissions"("tenantId", "name");

-- CreateIndex
CREATE INDEX "role_permissions_tenantId_idx" ON "role_permissions"("tenantId");
