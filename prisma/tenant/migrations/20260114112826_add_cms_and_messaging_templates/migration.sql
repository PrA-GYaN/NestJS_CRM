/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,slug]` on the table `blog_posts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,slug]` on the table `scholarships` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `blog_posts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `scholarships` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('Draft', 'Published', 'Unpublished');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('Email', 'SMS');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "MessageEventType" AS ENUM ('LeadCreated', 'LeadAssigned', 'LeadConverted', 'StudentCreated', 'AppointmentScheduled', 'AppointmentReminder', 'TaskAssigned', 'TaskDueReminder', 'VisaWorkflowStepChanged', 'DocumentRequested', 'DocumentUploaded', 'PaymentReceived', 'PaymentDue', 'PasswordReset', 'WelcomeEmail', 'Custom');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('Pending', 'Sent', 'Failed', 'Delivered');

-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN     "author" TEXT,
ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "featuredImage" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'Draft',
ADD COLUMN     "tags" JSONB;

-- AlterTable
ALTER TABLE "faqs" ADD COLUMN     "category" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "landing_pages" ADD COLUMN     "heroImage" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'Draft';

-- AlterTable
ALTER TABLE "scholarships" ADD COLUMN     "applicationUrl" TEXT,
ADD COLUMN     "countryName" TEXT,
ADD COLUMN     "currency" TEXT DEFAULT 'USD',
ADD COLUMN     "eligibility" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'Draft',
ADD COLUMN     "universityName" TEXT;

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "eventType" "MessageEventType",
    "status" "TemplateStatus" NOT NULL DEFAULT 'Inactive',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "eventType" "MessageEventType",
    "status" "TemplateStatus" NOT NULL DEFAULT 'Inactive',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageType" "TemplateType" NOT NULL,
    "emailTemplateId" TEXT,
    "smsTemplateId" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "eventType" "MessageEventType",
    "status" "MessageStatus" NOT NULL DEFAULT 'Pending',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_templates_tenantId_idx" ON "email_templates"("tenantId");

-- CreateIndex
CREATE INDEX "email_templates_tenantId_status_idx" ON "email_templates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "email_templates_tenantId_eventType_idx" ON "email_templates"("tenantId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_tenantId_name_key" ON "email_templates"("tenantId", "name");

-- CreateIndex
CREATE INDEX "sms_templates_tenantId_idx" ON "sms_templates"("tenantId");

-- CreateIndex
CREATE INDEX "sms_templates_tenantId_status_idx" ON "sms_templates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sms_templates_tenantId_eventType_idx" ON "sms_templates"("tenantId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "sms_templates_tenantId_name_key" ON "sms_templates"("tenantId", "name");

-- CreateIndex
CREATE INDEX "message_logs_tenantId_idx" ON "message_logs"("tenantId");

-- CreateIndex
CREATE INDEX "message_logs_tenantId_messageType_idx" ON "message_logs"("tenantId", "messageType");

-- CreateIndex
CREATE INDEX "message_logs_tenantId_status_idx" ON "message_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "message_logs_tenantId_eventType_idx" ON "message_logs"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "message_logs_tenantId_createdAt_idx" ON "message_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "blog_posts_tenantId_status_idx" ON "blog_posts"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_tenantId_slug_key" ON "blog_posts"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "faqs_tenantId_category_idx" ON "faqs"("tenantId", "category");

-- CreateIndex
CREATE INDEX "faqs_tenantId_sortOrder_idx" ON "faqs"("tenantId", "sortOrder");

-- CreateIndex
CREATE INDEX "landing_pages_tenantId_status_idx" ON "landing_pages"("tenantId", "status");

-- CreateIndex
CREATE INDEX "scholarships_tenantId_status_idx" ON "scholarships"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "scholarships_tenantId_slug_key" ON "scholarships"("tenantId", "slug");

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_smsTemplateId_fkey" FOREIGN KEY ("smsTemplateId") REFERENCES "sms_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
