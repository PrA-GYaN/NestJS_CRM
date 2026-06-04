/*
  Warnings:

  - A unique constraint covering the columns `[testId,studentId]` on the table `test_assignments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "test_assignments_testId_studentId_key" ON "test_assignments"("testId", "studentId");
