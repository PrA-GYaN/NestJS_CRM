-- Migration: add_counselor_documenttype
-- 1. Add assignedCounselorId to students table
ALTER TABLE "students" ADD COLUMN "assignedCounselorId" TEXT;

-- Foreign key: students.assignedCounselorId -> users.id
ALTER TABLE "students" ADD CONSTRAINT "students_assignedCounselorId_fkey"
  FOREIGN KEY ("assignedCounselorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for counselor lookups
CREATE INDEX "students_tenantId_assignedCounselorId_idx" ON "students"("tenantId", "assignedCounselorId");

-- 2. Add DocumentType enum values to the existing enum (already defined in schema for StudentDocument/VisaDocument)
--    DocumentType enum already exists in the DB from prior migrations.
--    Add new values that may not yet be present.
DO $$
BEGIN
  -- Add new DocumentType values if they don't exist yet
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OfferLetter'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DocumentType')) THEN
    ALTER TYPE "DocumentType" ADD VALUE 'OfferLetter';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AcademicDocument'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DocumentType')) THEN
    ALTER TYPE "DocumentType" ADD VALUE 'AcademicDocument';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FinancialDocument'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DocumentType')) THEN
    ALTER TYPE "DocumentType" ADD VALUE 'FinancialDocument';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LanguageTestResult'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DocumentType')) THEN
    ALTER TYPE "DocumentType" ADD VALUE 'LanguageTestResult';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RecommendationLetter'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DocumentType')) THEN
    ALTER TYPE "DocumentType" ADD VALUE 'RecommendationLetter';
  END IF;
END
$$;

-- 3. Add documentType column to file_uploads table
ALTER TABLE "file_uploads" ADD COLUMN "documentType" "DocumentType";

-- Index for documentType lookups
CREATE INDEX "file_uploads_tenantId_documentType_idx" ON "file_uploads"("tenantId", "documentType");
