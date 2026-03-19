-- AlterTable
ALTER TABLE "classes"
ADD COLUMN "name" TEXT,
ADD COLUMN "description" TEXT;

-- Backfill existing rows so name can be required
UPDATE "classes"
SET "name" = CONCAT('Class ', SUBSTRING("id" FROM 1 FOR 8))
WHERE "name" IS NULL;

-- Make name required
ALTER TABLE "classes"
ALTER COLUMN "name" SET NOT NULL;

-- Remove old level logic
ALTER TABLE "classes"
DROP COLUMN "level";

-- Remove enum type if no longer used
DROP TYPE IF EXISTS "ClassLevel";
