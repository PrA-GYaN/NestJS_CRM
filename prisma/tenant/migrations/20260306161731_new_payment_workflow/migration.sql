/*
  Warnings:

  - The values [PartiallyPaid,Overdue] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `currency` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNumber` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentType` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `processedBy` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `remainingAmount` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `transactionReference` on the `payments` table. All the data in the column will be lost.
  - Added the required column `amount` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('Pending', 'Completed', 'Failed', 'Refunded');
ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'Pending';
COMMIT;

-- DropIndex
DROP INDEX "payments_tenantId_dueDate_idx";

-- DropIndex
DROP INDEX "payments_tenantId_invoiceNumber_idx";

-- DropIndex
DROP INDEX "payments_tenantId_paymentType_idx";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "currency",
DROP COLUMN "dueDate",
DROP COLUMN "invoiceNumber",
DROP COLUMN "notes",
DROP COLUMN "paidAmount",
DROP COLUMN "paymentMethod",
DROP COLUMN "paymentType",
DROP COLUMN "processedBy",
DROP COLUMN "remainingAmount",
DROP COLUMN "totalAmount",
DROP COLUMN "transactionReference",
ADD COLUMN     "amount" DECIMAL(10,2) NOT NULL;

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentType";
