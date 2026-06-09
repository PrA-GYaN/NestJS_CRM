import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsObject,
  IsEnum,
  IsNumber,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ============================================
// STUDENT PROFILE DTOs
// ============================================

export class UpdateStudentProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Academic records as JSON object' })
  @IsOptional()
  @IsObject()
  academicRecords?: any;

  @ApiPropertyOptional({ description: 'Test scores (IELTS, TOEFL, GRE, etc.) as JSON object' })
  @IsOptional()
  @IsObject()
  testScores?: any;

  @ApiPropertyOptional({ description: 'Identification documents details as JSON object' })
  @IsOptional()
  @IsObject()
  identificationDocs?: any;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password for verification' })
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @ApiProperty({
    description:
      'New password (min 8 chars, must contain uppercase, lowercase, and number or special character)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, and number/special character',
  })
  newPassword!: string;

  @ApiProperty({ description: 'Confirm new password - must match newPassword' })
  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}

// ============================================
// DOCUMENT MANAGEMENT DTOs
// ============================================

export enum DocumentTypeEnum {
  Passport = 'Passport',
  Transcript = 'Transcript',
  VisaForm = 'VisaForm',
  Photo = 'Photo',
  Certificate = 'Certificate',
  OfferLetter = 'OfferLetter',
  AcademicDocument = 'AcademicDocument',
  FinancialDocument = 'FinancialDocument',
  LanguageTestResult = 'LanguageTestResult',
  RecommendationLetter = 'RecommendationLetter',
  Other = 'Other',
}

export class UploadStudentDocumentDto {
  @ApiProperty({ enum: DocumentTypeEnum })
  @IsEnum(DocumentTypeEnum)
  documentType!: DocumentTypeEnum;

  @ApiProperty()
  @IsString()
  filePath!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  fileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Additional document metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

// ============================================
// COURSE APPLICATION DTOs
// ============================================

export enum ApplicationStatusEnum {
  Draft = 'Draft',
  Submitted = 'Submitted',
  UnderReview = 'UnderReview',
  Shortlisted = 'Shortlisted',
  OfferReceived = 'OfferReceived',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
  Withdrawn = 'Withdrawn',
}

export class CreateCourseApplicationDto {
  @ApiProperty()
  @IsUUID()
  courseId!: string;

  @ApiProperty()
  @IsUUID()
  universityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intakePeriod?: string;

  @ApiPropertyOptional({ description: 'Additional notes as JSON object' })
  @IsOptional()
  @IsObject()
  notes?: any;
}

export class UpdateCourseApplicationDto {
  @ApiPropertyOptional({ enum: ApplicationStatusEnum })
  @IsOptional()
  @IsEnum(ApplicationStatusEnum)
  status?: ApplicationStatusEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intakePeriod?: string;

  @ApiPropertyOptional({ description: 'Additional notes as JSON object' })
  @IsOptional()
  @IsObject()
  notes?: any;
}

// ============================================
// NOTIFICATION DTOs
// ============================================

export class MarkNotificationReadDto {
  @ApiProperty({ type: [String] })
  notificationIds!: string[];
}

// ============================================
// QUERY DTOs
// ============================================

export class StudentApplicationsQueryDto {
  @ApiPropertyOptional({ enum: ApplicationStatusEnum })
  @IsOptional()
  @IsEnum(ApplicationStatusEnum)
  status?: ApplicationStatusEnum;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class DocumentsQueryDto {
  @ApiPropertyOptional({ enum: DocumentTypeEnum })
  @IsOptional()
  @IsEnum(DocumentTypeEnum)
  documentType?: DocumentTypeEnum;

  @ApiPropertyOptional({ enum: ['Pending', 'Verified', 'Rejected', 'Expired'] })
  @IsOptional()
  @IsString()
  verificationStatus?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class NotificationsQueryDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class TasksQueryDto {
  @ApiPropertyOptional({ type: Boolean, description: 'Filter for only pending/in-progress tasks' })
  @IsOptional()
  @IsBoolean()
  pending?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class PaymentsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class ServicesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class VisaApplicationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================
// DASHBOARD DTOs
// ============================================

export class DashboardVisaWorkflowStepDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  stepOrder!: number;

  @ApiProperty()
  requiresDocument!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ nullable: true })
  expectedDurationDays?: number | null;
}

export class DashboardVisaWorkflowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: DashboardVisaWorkflowStepDto, nullable: true })
  currentStep?: DashboardVisaWorkflowStepDto | null;

  @ApiProperty({ type: [DashboardVisaWorkflowStepDto] })
  steps!: DashboardVisaWorkflowStepDto[];
}

export class DashboardVisaApplicationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  destinationCountry?: string | null;

  @ApiPropertyOptional({ nullable: true })
  submissionDate?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  decisionDate?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  currentStepId?: string | null;

  @ApiProperty({ type: Object })
  visaType!: any;

  @ApiProperty({ type: DashboardVisaWorkflowDto })
  workflow!: DashboardVisaWorkflowDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class DashboardRecentActivityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata?: any;

  @ApiProperty()
  createdAt!: Date;
}

export class DashboardUpcomingTaskDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  priority!: string;

  @ApiProperty()
  dueDate!: Date;

  @ApiProperty()
  createdAt!: Date;
}

export class DashboardUpcomingAppointmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  scheduledAt!: Date;

  @ApiProperty()
  endTime!: Date;

  @ApiProperty()
  duration!: number;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  purpose?: string | null;

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;

  @ApiProperty({ type: Object })
  staff!: any;
}

export class DashboardStatsResponseDto {
  @ApiProperty()
  totalApplications!: number;

  @ApiProperty()
  pendingApplications!: number;

  @ApiProperty()
  offersReceived!: number;

  @ApiProperty()
  activeVisaApplications!: number;

  @ApiProperty()
  pendingTasks!: number;

  @ApiProperty()
  upcomingAppointments!: number;

  @ApiProperty()
  unreadNotifications!: number;

  @ApiProperty()
  documentsToUpload!: number;

  @ApiProperty()
  profileCompleteness!: number;

  @ApiProperty({ type: [DashboardVisaApplicationDto] })
  visaApplications!: DashboardVisaApplicationDto[];

  @ApiProperty({ type: [DashboardRecentActivityDto] })
  recentActivity!: DashboardRecentActivityDto[];

  @ApiProperty({ type: [DashboardUpcomingTaskDto] })
  upcomingTasks!: DashboardUpcomingTaskDto[];

  @ApiProperty({ type: [DashboardUpcomingAppointmentDto] })
  upcomingAppointmentsList!: DashboardUpcomingAppointmentDto[];
}

// ============================================
// SERVICES RESPONSE DTOs
// ============================================

export class ServiceAssignmentDto {
  @ApiProperty()
  isAssigned!: boolean;

  @ApiPropertyOptional({ nullable: true })
  assignmentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  assignedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  notes?: string | null;
}

export class ClassAssignmentDto {
  @ApiProperty()
  isAssigned!: boolean;

  @ApiPropertyOptional({ nullable: true })
  enrollmentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  status?: string | null;

  @ApiPropertyOptional({ nullable: true })
  assignedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt?: Date | null;
}

export class TestAssignmentDto {
  @ApiProperty()
  isAssigned!: boolean;

  @ApiPropertyOptional({ nullable: true })
  assignmentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  status?: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  score?: number | null;

  @ApiPropertyOptional({ nullable: true })
  assignedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  updatedAt?: Date | null;
}

export class StudentPanelClassSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ type: Object })
  schedule!: any;

  @ApiProperty()
  studentCapacity!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: ClassAssignmentDto })
  assignment!: ClassAssignmentDto;
}

export class StudentPanelTestSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  studentCapacity!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: TestAssignmentDto })
  assignment!: TestAssignmentDto;
}

export class StudentPanelServiceSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ type: Number })
  price!: any;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: ServiceAssignmentDto })
  assignment!: ServiceAssignmentDto;

  @ApiProperty({ type: [StudentPanelClassSummaryDto] })
  classes!: StudentPanelClassSummaryDto[];

  @ApiProperty({ type: [StudentPanelTestSummaryDto] })
  tests!: StudentPanelTestSummaryDto[];
}

export class StudentPanelServicesResponseDto {
  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  totalServices!: number;

  @ApiProperty()
  assignedServices!: number;

  @ApiProperty({ type: [StudentPanelServiceSummaryDto] })
  services!: StudentPanelServiceSummaryDto[];
}
