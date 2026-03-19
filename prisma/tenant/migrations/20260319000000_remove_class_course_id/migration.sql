-- Remove deprecated course linkage from classes
ALTER TABLE "classes"
DROP COLUMN IF EXISTS "courseId" CASCADE;
