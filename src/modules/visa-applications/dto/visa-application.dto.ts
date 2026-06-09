import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  Min,
  IsInt,
  Max,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VisaStatus } from '@prisma/tenant-client';

export class CreateVisaApplicationDto {
  @ApiProperty({
    description: 'The unique identifier of the student applying for the visa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({
    description: 'The unique identifier of the specific Visa Type being applied for',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @IsUUID()
  @IsNotEmpty()
  visaTypeId!: string;

  @ApiPropertyOptional({
    description: 'The unique identifier of the linked Course Application (if applicable)',
    example: 'c64a595f-9e79-4d64-886d-0bbddbf6ae50',
  })
  @IsUUID()
  @IsOptional()
  courseApplicationId?: string;

  @ApiPropertyOptional({
    description: 'The destination country for the visa',
    example: 'Australia',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  destinationCountry?: string;

  @ApiPropertyOptional({
    description:
      'The unique identifier of the workflow to use for this visa application. If not provided, the default workflow for the visa type is used. Must be a valid workflow for the selected visaTypeId.',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ef',
  })
  @IsUUID()
  @IsOptional()
  workflowId?: string;

  @ApiPropertyOptional({
    description:
      "The unique identifier of the workflow version to use for this visa application. If not provided, the workflow's current default version is used.",
    example: 'b2c3d4e5-f6a7-8901-bcde-2345678901fa',
  })
  @IsUUID()
  @IsOptional()
  workflowVersionId?: string;
}

export class AdvanceVisaStepDto {
  @ApiPropertyOptional({
    description: 'Optional remarks or notes detailing the progression of the step',
    example: 'Biometric verification cleared successfully.',
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}

export class DefaultFilterDto {
  @ApiPropertyOptional({
    description: 'Filter visa applications by student ID',
  })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({
    description: 'Filter visa applications by Visa Type ID',
  })
  @IsUUID()
  @IsOptional()
  visaTypeId?: string;

  @ApiPropertyOptional({
    description: 'Filter visa applications by linked Course Application ID',
  })
  @IsUUID()
  @IsOptional()
  courseApplicationId?: string;

  @ApiPropertyOptional({
    description:
      'Filter visa applications by status (e.g., Pending, Submitted, Approved, Rejected)',
    example: 'Pending',
  })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination (1-indexed)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort order (asc or desc)',
    example: 'desc',
  })
  @IsString()
  @IsOptional()
  sortOrder?: string;
}

export class UpdateVisaApplicationDto {
  @ApiPropertyOptional({
    description: 'The unique identifier of the Visa Type',
  })
  @IsUUID()
  @IsOptional()
  visaTypeId?: string;

  @ApiPropertyOptional({
    description: 'The unique identifier of the linked Course Application',
  })
  @IsUUID()
  @IsOptional()
  courseApplicationId?: string;

  @ApiPropertyOptional({
    description: 'The destination country for the visa',
    example: 'Australia',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  destinationCountry?: string;

  @ApiPropertyOptional({
    description: 'Visa application status',
    enum: VisaStatus,
    example: 'Approved',
  })
  @IsEnum(VisaStatus)
  @IsOptional()
  status?: VisaStatus;

  @ApiPropertyOptional({
    description: 'Current workflow step ID',
  })
  @IsUUID()
  @IsOptional()
  currentStepId?: string;

  @ApiPropertyOptional({
    description: 'Date when the visa application was submitted',
    example: '2025-06-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  submissionDate?: string;

  @ApiPropertyOptional({
    description: 'Date when a decision was made on the visa application',
    example: '2025-06-15T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  decisionDate?: string;
}
