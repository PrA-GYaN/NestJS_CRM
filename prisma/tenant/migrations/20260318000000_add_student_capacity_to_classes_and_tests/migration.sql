-- AlterTable
ALTER TABLE "classes"
ADD COLUMN "studentCapacity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "tests"
ADD COLUMN "studentCapacity" INTEGER NOT NULL DEFAULT 1;
