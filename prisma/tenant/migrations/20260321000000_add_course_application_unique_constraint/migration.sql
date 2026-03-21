/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,studentId,courseId]` on the table `course_applications` will be added.
    If there are existing duplicate values, this will fail.

*/

-- CreateIndex
CREATE UNIQUE INDEX "course_applications_tenantId_studentId_courseId_key"
ON "course_applications"("tenantId", "studentId", "courseId");
