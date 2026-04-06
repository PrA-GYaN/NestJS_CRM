import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TestType {
  IELTS = 'IELTS',
  TOEFL = 'TOEFL',
  GRE = 'GRE',
  GMAT = 'GMAT',
  SAT = 'SAT',
  Other = 'Other',
}

export class CreateTestDto {
  @ApiProperty({ description: 'Service ID this test belongs to' })
  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({ description: 'Test name', example: 'IELTS Academic' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: TestType, description: 'Test type' })
  @IsEnum(TestType)
  @IsNotEmpty()
  type!: TestType;

  @ApiPropertyOptional({ description: 'Test description', example: 'International English Language Testing System' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Date and time when the test will be conducted', example: '2026-05-15T10:00:00Z' })
  @IsOptional()
  @IsISO8601()
  scheduledDate?: string;

  @ApiProperty({
    description: 'Maximum number of students allowed for this test',
    example: 100,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  studentCapacity!: number;

  @ApiPropertyOptional({
    description: 'Duration in minutes to hold seat reservation for pending requests',
    example: 15,
    minimum: 1,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  @Type(() => Number)
  reservationDurationMinutes?: number;
}

export class UpdateTestDto {
  @ApiPropertyOptional({ description: 'Service ID this test belongs to' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Test name', example: 'IELTS Academic' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: TestType, description: 'Test type' })
  @IsOptional()
  @IsEnum(TestType)
  type?: TestType;

  @ApiPropertyOptional({ description: 'Test description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Date and time when the test will be conducted' })
  @IsOptional()
  @IsISO8601()
  scheduledDate?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of students allowed for this test',
    example: 150,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  studentCapacity?: number;

  @ApiPropertyOptional({
    description: 'Duration in minutes to hold seat reservation for pending requests',
    example: 20,
    minimum: 1,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  @Type(() => Number)
  reservationDurationMinutes?: number;
}

export class AssignTestToStudentDto {
  @ApiProperty({ description: 'Student ID to assign the test to', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;
}

export class UpdateTestAssignmentDto {
  @ApiPropertyOptional({ enum: ['Pending', 'Completed', 'Graded'], description: 'Assignment status' })
  @IsOptional()
  @IsEnum(['Pending', 'Completed', 'Graded'])
  status?: 'Pending' | 'Completed' | 'Graded';

  @ApiPropertyOptional({ description: 'Score achieved (0–100)', example: 85.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  score?: number;
}

export class CreateTestBookingRequestDto {
  @ApiPropertyOptional({ description: 'Additional notes for the test booking request' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveRejectTestBookingRequestDto {
  @ApiPropertyOptional({ description: 'User ID who is approving/rejecting the request' })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'User ID who is approving/rejecting the request' })
  @IsOptional()
  @IsString()
  rejectedBy?: string;

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
