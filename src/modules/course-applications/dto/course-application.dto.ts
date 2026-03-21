import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/tenant-client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateCourseApplicationDto {
  @ApiProperty({
    description: 'Course ID to apply for',
    format: 'uuid',
  })
  @IsUUID()
  courseId!: string;

  @ApiPropertyOptional({
    description: 'Intake period label (e.g. Fall 2026)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  intakePeriod?: string;

  @ApiPropertyOptional({
    description: 'Application notes',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateApplicationStatusDto {
  @ApiProperty({
    description: 'New application status',
    enum: [ApplicationStatus.Accepted, ApplicationStatus.Rejected],
  })
  @IsEnum([ApplicationStatus.Accepted, ApplicationStatus.Rejected])
  status!: 'Accepted' | 'Rejected';

  @ApiPropertyOptional({
    description: 'Reason when rejecting an application',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}

export class ApplicationsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Filter by course ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;
}

export class StudentApplicationsQueryDto extends ApplicationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by student ID (admin/instructor only)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;
}

export class StudentIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;
}

export class CountrySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;
}

export class UniversitySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  ranking?: number | null;

  @ApiPropertyOptional({ type: () => CountrySummaryDto })
  country?: CountrySummaryDto;
}

export class CourseSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  duration?: string | null;

  @ApiPropertyOptional({ nullable: true })
  fees?: number | null;

  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  requirements?: Record<string, any> | null;

  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  intakePeriods?: Record<string, any> | null;

  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  deadlines?: Record<string, any> | null;
}

export class StudentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

export class CourseApplicationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  tenantId!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  courseId!: string;

  @ApiProperty({ format: 'uuid' })
  universityId!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiPropertyOptional({ nullable: true })
  intakePeriod?: string | null;

  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  notes?: Record<string, any> | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionReason?: string | null;

  @ApiProperty()
  applicationDate!: Date;

  @ApiPropertyOptional({ nullable: true })
  submissionDate?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  decisionDate?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: () => StudentSummaryDto })
  student?: StudentSummaryDto;

  @ApiPropertyOptional({ type: () => CourseSummaryDto })
  course?: CourseSummaryDto;

  @ApiPropertyOptional({ type: () => UniversitySummaryDto })
  university?: UniversitySummaryDto;
}

export class PaginatedCourseApplicationsResponseDto {
  @ApiProperty({ type: () => [CourseApplicationResponseDto] })
  data!: CourseApplicationResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class DeleteCourseApplicationResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;
}
