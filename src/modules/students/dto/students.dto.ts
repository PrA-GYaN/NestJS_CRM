import {
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    enum: ['Passport', 'Transcript', 'VisaForm', 'Photo', 'Certificate', 'OfferLetter', 'AcademicDocument', 'FinancialDocument', 'LanguageTestResult', 'RecommendationLetter', 'Other'],
  })
  @IsEnum(['Passport', 'Transcript', 'VisaForm', 'Photo', 'Certificate', 'OfferLetter', 'AcademicDocument', 'FinancialDocument', 'LanguageTestResult', 'RecommendationLetter', 'Other'])
  documentType!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  filePath!: string;
}

export class AssignVisaTypeDto {
  @ApiProperty({
    description: 'ID of the VisaType to assign to the student',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  visaTypeId!: string;

  @ApiProperty({
    description: 'Destination country name (kept for compatibility)',
    example: 'United Kingdom',
  })
  @IsString()
  @IsNotEmpty()
  destinationCountry!: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the visa application',
    example: 'Student applying for Tier 4 visa',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
