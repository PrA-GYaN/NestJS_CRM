-- Remove class-to-course linkage
ALTER TABLE "classes"
  DROP COLUMN IF EXISTS "course_id",
  DROP COLUMN IF EXISTS "courseId";
