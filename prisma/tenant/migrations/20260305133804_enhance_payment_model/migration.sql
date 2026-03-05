/*
  Warnings:

  - You are about to drop the column `amount` on the `payments` table. All the data in the column will be lost.
  - Added the required column `paidAmount` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remainingAmount` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'BankTransfer', 'Card', 'Cheque', 'Online', 'Other');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('Full', 'Advance', 'Partial', 'Balance');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'PartiallyPaid';
ALTER TYPE "PaymentStatus" ADD VALUE 'Overdue';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "amount",
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paidAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'Cash',
ADD COLUMN     "paymentType" "PaymentType" NOT NULL DEFAULT 'Full',
ADD COLUMN     "processedBy" TEXT,
ADD COLUMN     "remainingAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "totalAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "transactionReference" TEXT;

-- CreateIndex
CREATE INDEX "payments_tenantId_paymentType_idx" ON "payments"("tenantId", "paymentType");

-- CreateIndex
CREATE INDEX "payments_tenantId_dueDate_idx" ON "payments"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "payments_tenantId_invoiceNumber_idx" ON "payments"("tenantId", "invoiceNumber");
