-- CreateEnum
CREATE TYPE "FeaturePackage" AS ENUM ('Basic', 'Advanced');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('Active', 'Suspended', 'Inactive');

-- CreateEnum
CREATE TYPE "PlatformAdminRole" AS ENUM ('SuperAdmin');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "dbName" TEXT NOT NULL,
    "dbHost" TEXT NOT NULL,
    "dbPort" INTEGER NOT NULL DEFAULT 5432,
    "dbUser" TEXT NOT NULL,
    "dbPassword" TEXT NOT NULL,
    "featurePackage" "FeaturePackage" NOT NULL DEFAULT 'Basic',
    "status" "TenantStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "PlatformAdminRole" NOT NULL DEFAULT 'SuperAdmin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_dbName_key" ON "tenants"("dbName");

-- CreateIndex
CREATE INDEX "tenants_subdomain_idx" ON "tenants"("subdomain");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE INDEX "platform_admins_email_idx" ON "platform_admins"("email");
