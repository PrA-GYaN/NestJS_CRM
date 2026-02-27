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
  @ApiProperty()
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, and number/special character',
  })
  newPassword!: string;
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

// ============================================
// DASHBOARD DTOs
// ============================================

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
}
