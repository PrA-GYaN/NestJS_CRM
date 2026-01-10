-- CreateEnum
CREATE TYPE "FeaturePackage" AS ENUM ('Basic', 'Advanced');
CREATE TYPE "TenantStatus" AS ENUM ('Active', 'Suspended', 'Inactive');
CREATE TYPE "PlatformAdminRole" AS ENUM ('SuperAdmin');
CREATE TYPE "UserStatus" AS ENUM ('Active', 'Inactive');
CREATE TYPE "LeadStatus" AS ENUM ('New', 'Contacted', 'Qualified', 'Converted');
CREATE TYPE "Priority" AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE "StudentStatus" AS ENUM ('Prospective', 'Enrolled', 'Alumni');
CREATE TYPE "DocumentType" AS ENUM ('Passport', 'Transcript', 'VisaForm', 'Photo', 'Certificate', 'Other');
CREATE TYPE "ClassLevel" AS ENUM ('Beginner', 'Intermediate', 'Advanced');
CREATE TYPE "EnrollmentStatus" AS ENUM ('Active', 'Completed', 'Dropped');
CREATE TYPE "TestType" AS ENUM ('IELTS', 'TOEFL', 'GRE', 'GMAT', 'SAT', 'Other');
CREATE TYPE "TestAssignmentStatus" AS ENUM ('Pending', 'Completed', 'Graded');
CREATE TYPE "AppointmentStatus" AS ENUM ('Scheduled', 'Completed', 'Cancelled', 'NoShow');
CREATE TYPE "TaskStatus" AS ENUM ('Pending', 'InProgress', 'Completed', 'Cancelled');
CREATE TYPE "RelatedEntityType" AS ENUM ('Student', 'Lead', 'Visa', 'Service', 'Appointment');
CREATE TYPE "VisaStatus" AS ENUM ('Pending', 'Submitted', 'Approved', 'Rejected', 'UnderReview');
CREATE TYPE "CommissionStatus" AS ENUM ('Pending', 'Paid', 'Cancelled');
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Completed', 'Failed', 'Refunded');
CREATE TYPE "NotificationType" AS ENUM ('Email', 'SMS', 'InApp');
CREATE TYPE "NotificationStatus" AS ENUM ('Sent', 'Pending', 'Failed');
CREATE TYPE "AuditAction" AS ENUM ('Create', 'Update', 'Delete', 'Login', 'Logout');

-- Note: This is a reference migration file.
-- Actual migrations should be generated using: npx prisma migrate dev
