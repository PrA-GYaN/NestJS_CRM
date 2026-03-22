import {
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  IsArray,
  ValidateNested,
  Matches,
  IsInt,
  Min,
  ArrayMinSize,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ClassDayOfWeek {
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
  Saturday = 'Saturday',
  Sunday = 'Sunday',
}

export class ClassDayTimingDto {
  @ApiProperty({ enum: ClassDayOfWeek, description: 'Day of week for this class timing' })
  @IsEnum(ClassDayOfWeek)
  @IsNotEmpty()
  day!: ClassDayOfWeek;

  @ApiProperty({
    description: 'Class start time in UTC, 24-hour HH:MM format',
    example: '10:00',
  })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format (24-hour UTC)',
  })
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({
    description: 'Class end time in UTC, 24-hour HH:MM format',
    example: '11:30',
  })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:MM format (24-hour UTC)',
  })
  @IsNotEmpty()
  endTime!: string;
}

export class CreateClassDto {
  @ApiProperty({ description: 'Service ID this class belongs to' })
  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({ description: 'Class name', example: 'IELTS Morning Batch' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Class description', example: 'Weekday class for IELTS preparation.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Class schedule as array of day-wise timings in UTC',
    type: [ClassDayTimingDto],
    example: [
      { day: 'Monday', startTime: '10:00', endTime: '11:30' },
      { day: 'Wednesday', startTime: '14:00', endTime: '15:30' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ClassDayTimingDto)
  @IsNotEmpty()
  schedule!: ClassDayTimingDto[];

  @ApiProperty({
    description: 'Maximum number of students allowed in this class',
    example: 25,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  studentCapacity!: number;

  @ApiPropertyOptional({ description: 'Instructor user ID' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ description: 'Service ID this class belongs to' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Class name', example: 'IELTS Evening Batch' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Class description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Class schedule as array of day-wise timings in UTC',
    type: [ClassDayTimingDto],
    example: [
      { day: 'Tuesday', startTime: '09:00', endTime: '10:30' },
      { day: 'Thursday', startTime: '16:00', endTime: '17:30' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ClassDayTimingDto)
  schedule?: ClassDayTimingDto[];

  @ApiPropertyOptional({
    description: 'Maximum number of students allowed in this class',
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  studentCapacity?: number;

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

export class CreateClassBookingRequestDto {
  @ApiPropertyOptional({
    description: 'Optional note from the student while requesting the class',
    example: 'Prefer weekday morning batch.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectClassBookingRequestDto {
  @ApiPropertyOptional({
    description: 'Optional rejection reason from approver',
    example: 'Class prerequisites are not met yet.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
