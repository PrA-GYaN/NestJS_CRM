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
