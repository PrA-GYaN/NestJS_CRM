import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';

export enum FileCategory {
  StudentDocument = 'StudentDocument',
  VisaDocument = 'VisaDocument',
  CourseDocument = 'CourseDocument',
  General = 'General',
}

export class UploadFileDto {
  @ApiProperty({
    description: 'File category',
    enum: FileCategory,
    example: FileCategory.StudentDocument,
  })
  @IsEnum(FileCategory)
  @IsNotEmpty()
  category!: FileCategory;

  @ApiProperty({
    description: 'Student ID (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiProperty({
    description: 'Visa application ID (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsUUID()
  visaApplicationId?: string;

  @ApiProperty({
    description: 'Course ID (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
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
