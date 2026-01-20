-- CreateTable
CREATE TABLE "student_services" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_services_tenantId_studentId_idx" ON "student_services"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "student_services_tenantId_serviceId_idx" ON "student_services"("tenantId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "student_services_studentId_serviceId_key" ON "student_services"("studentId", "serviceId");

-- AddForeignKey
ALTER TABLE "student_services" ADD CONSTRAINT "student_services_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_services" ADD CONSTRAINT "student_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
