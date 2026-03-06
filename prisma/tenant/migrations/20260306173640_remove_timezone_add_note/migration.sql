/*
  Warnings:

  - You are about to drop the column `timezone` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `tenant_working_hours` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "timezone",
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "tenant_working_hours" DROP COLUMN "timezone";
