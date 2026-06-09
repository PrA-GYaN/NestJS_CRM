import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { FileCategory } from './upload-file.dto';

export class UpdateFileDto {
  @ApiPropertyOptional({
    description: 'File category',
    enum: FileCategory,
    example: FileCategory.Passport,
  })
  @IsEnum(FileCategory)
  @IsOptional()
  category?: FileCategory;

  @ApiPropertyOptional({
    description: 'Student ID associated with this file',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @IsUUID()
  studentId?: string | null;

  @ApiPropertyOptional({
    description: 'Visa application ID associated with this file',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @IsUUID()
  visaApplicationId?: string | null;

  @ApiPropertyOptional({
    description: 'Course ID associated with this file',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @IsUUID()
  courseId?: string | null;

  @ApiPropertyOptional({
    description: 'Original display file name',
    example: 'passport-john-doe.pdf',
  })
  @IsString()
  @IsOptional()
  originalFileName?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata (JSON)',
  })
  @IsOptional()
  metadata?: any;
}
