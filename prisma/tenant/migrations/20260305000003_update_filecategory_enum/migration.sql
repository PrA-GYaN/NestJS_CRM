-- Migration: update_filecategory_enum
-- Replace old FileCategory values with document-type-oriented values
-- and remove the redundant documentType column from file_uploads.

-- 1. Drop documentType column if it exists (added and now removed)
ALTER TABLE "file_uploads" DROP COLUMN IF EXISTS "documentType";

-- 2. Remove old FileCategory enum values and add new ones.
--    PostgreSQL does not support DROP VALUE, so we rename the old type,
--    create the new type, migrate the column, then drop the old type.

-- Rename existing enum
ALTER TYPE "FileCategory" RENAME TO "FileCategory_old";

-- Create new enum
CREATE TYPE "FileCategory" AS ENUM (
  'Passport',
  'Transcript',
  'VisaForm',
  'Photo',
  'Certificate',
  'OfferLetter',
  'AcademicDocument',
  'FinancialDocument',
  'LanguageTestResult',
  'RecommendationLetter',
  'Other'
);

-- Migrate column: map old generic values to 'Other' as a safe default
ALTER TABLE "file_uploads"
  ALTER COLUMN "category" DROP DEFAULT,
  ALTER COLUMN "category" TYPE "FileCategory"
    USING (
      CASE "category"::text
        WHEN 'StudentDocument'  THEN 'Other'
        WHEN 'VisaDocument'     THEN 'Other'
        WHEN 'CourseDocument'   THEN 'Other'
        WHEN 'General'          THEN 'Other'
        ELSE "category"::text
      END
    )::"FileCategory";

-- Drop old enum
DROP TYPE "FileCategory_old";
