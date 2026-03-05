import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';

export enum FileCategory {
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

export class UploadFileDto {
  @ApiProperty({
    description: 'File category',
    enum: FileCategory,
    example: FileCategory.Passport,
  })
  @IsEnum(FileCategory)
  @IsNotEmpty()
  category!: FileCategory;

  @ApiProperty({
    description: 'Student ID — required. Associates the uploaded file with a specific student.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  studentId!: string;

  @ApiProperty({
    description: 'Visa application ID — optional. Omit when uploading general documents or course-specific files.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @IsUUID()
  visaApplicationId?: string;

  @ApiProperty({
    description: 'Course ID — optional. Omit when uploading general documents or visa-specific files.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({
    description: 'Additional metadata (JSON)',
    required: false,
  })
  @IsOptional()
  metadata?: any;
}
