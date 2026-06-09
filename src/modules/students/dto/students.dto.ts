import {
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentVerificationStatusDto {
  Pending = 'Pending',
  Verified = 'Verified',
  Rejected = 'Rejected',
  Expired = 'Expired',
}

export class CreateStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({
    description: 'ID of the staff member with Counselor role to assign to this student',
  })
  @IsOptional()
  @IsUUID()
  assignedCounselorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  academicRecords?: any;

  @ApiPropertyOptional()
  @IsOptional()
  testScores?: any;

  @ApiPropertyOptional()
  @IsOptional()
  identificationDocs?: any;

  @ApiPropertyOptional({ enum: ['High', 'Medium', 'Low'] })
  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  priority?: 'High' | 'Medium' | 'Low';
}

export class UpdateStudentDto {
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
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  academicRecords?: any;

  @ApiPropertyOptional()
  @IsOptional()
  testScores?: any;

  @ApiPropertyOptional()
  @IsOptional()
  identificationDocs?: any;

  @ApiPropertyOptional({ enum: ['Prospective', 'Enrolled', 'Alumni'] })
  @IsOptional()
  @IsEnum(['Prospective', 'Enrolled', 'Alumni'])
  status?: 'Prospective' | 'Enrolled' | 'Alumni';

  @ApiPropertyOptional({ enum: ['High', 'Medium', 'Low'] })
  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  priority?: 'High' | 'Medium' | 'Low';

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class AssignCounselorDto {
  @ApiProperty({
    description: 'ID of the staff member with Counselor role to assign',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  counselorId!: string;
}

export class UploadDocumentDto {
  @ApiProperty({
    enum: [
      'Passport',
      'Transcript',
      'VisaForm',
      'Photo',
      'Certificate',
      'OfferLetter',
      'AcademicDocument',
      'FinancialDocument',
      'LanguageTestResult',
      'RecommendationLetter',
      'Other',
    ],
  })
  @IsEnum([
    'Passport',
    'Transcript',
    'VisaForm',
    'Photo',
    'Certificate',
    'OfferLetter',
    'AcademicDocument',
    'FinancialDocument',
    'LanguageTestResult',
    'RecommendationLetter',
    'Other',
  ])
  documentType!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  filePath!: string;

  @ApiPropertyOptional({ description: 'Display file name for this document' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({ description: 'Document expiration date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (JSON)' })
  @IsOptional()
  metadata?: any;
}

export class UpdateStudentDocumentDto {
  @ApiPropertyOptional({
    enum: [
      'Passport',
      'Transcript',
      'VisaForm',
      'Photo',
      'Certificate',
      'OfferLetter',
      'AcademicDocument',
      'FinancialDocument',
      'LanguageTestResult',
      'RecommendationLetter',
      'Other',
    ],
  })
  @IsOptional()
  @IsEnum([
    'Passport',
    'Transcript',
    'VisaForm',
    'Photo',
    'Certificate',
    'OfferLetter',
    'AcademicDocument',
    'FinancialDocument',
    'LanguageTestResult',
    'RecommendationLetter',
    'Other',
  ])
  documentType?: string;

  @ApiPropertyOptional({ description: 'Document file path' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  filePath?: string;

  @ApiPropertyOptional({ description: 'Display file name for this document' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({ description: 'Version number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ enum: DocumentVerificationStatusDto })
  @IsOptional()
  @IsEnum(DocumentVerificationStatusDto)
  verificationStatus?: DocumentVerificationStatusDto;

  @ApiPropertyOptional({ description: 'Verifier user ID' })
  @IsOptional()
  @IsUUID()
  verifiedBy?: string;

  @ApiPropertyOptional({ description: 'Verification date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  verificationDate?: string;

  @ApiPropertyOptional({ description: 'Verification notes' })
  @IsOptional()
  @IsString()
  verificationNotes?: string;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Document expiration date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (JSON)' })
  @IsOptional()
  metadata?: any;
}
