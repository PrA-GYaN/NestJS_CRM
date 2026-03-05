import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ClassLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
}

export class CreateClassDto {
  @ApiProperty({ enum: ClassLevel, description: 'Class difficulty level' })
  @IsEnum(ClassLevel)
  @IsNotEmpty()
  level!: ClassLevel;

  @ApiProperty({
    description: 'Class schedule (dates, times, frequency)',
    example: { days: ['Monday', 'Wednesday'], time: '10:00', timezone: 'UTC' },
  })
  @IsObject()
  @IsNotEmpty()
  schedule!: Record<string, any>;

  @ApiPropertyOptional({ description: 'Course ID to link this class to' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Instructor user ID' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ enum: ClassLevel, description: 'Class difficulty level' })
  @IsOptional()
  @IsEnum(ClassLevel)
  level?: ClassLevel;

  @ApiPropertyOptional({
    description: 'Class schedule (dates, times, frequency)',
    example: { days: ['Tuesday', 'Thursday'], time: '14:00', timezone: 'UTC' },
  })
  @IsOptional()
  @IsObject()
  schedule?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Course ID to link this class to' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Instructor user ID' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;
}

export class EnrollStudentInClassDto {
  @ApiProperty({ description: 'Student ID to enroll', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;
}

export class UpdateEnrollmentStatusDto {
  @ApiProperty({ enum: ['Active', 'Completed', 'Dropped'], description: 'Enrollment status' })
  @IsEnum(['Active', 'Completed', 'Dropped'])
  @IsNotEmpty()
  status!: 'Active' | 'Completed' | 'Dropped';
}
