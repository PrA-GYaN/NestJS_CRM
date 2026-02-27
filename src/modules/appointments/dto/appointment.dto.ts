import {
  IsString,
  IsUUID,
  IsInt,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/common.dto';
import { Type } from 'class-transformer';

export enum AppointmentStatusEnum {
  Pending = 'Pending',
  Booked = 'Booked',
  Rejected = 'Rejected',
  Scheduled = 'Scheduled', // Legacy
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  NoShow = 'NoShow',
}

export enum AppointmentRequestedByEnum {
  Student = 'Student',
  Staff = 'Staff',
  System = 'System',
}

// ===== Student Appointment Request =====
export class CreateAppointmentRequestDto {
  @ApiPropertyOptional({
    description: 'Preferred staff member ID (if not provided, system assigns)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiProperty({
    description: 'Appointment start time in ISO 8601 format (UTC)',
    example: '2026-03-01T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({
    description: 'Appointment duration in minutes (15-120)',
    example: 60,
    minimum: 15,
    maximum: 120,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(15)
  @Max(120)
  duration!: number;

  @ApiProperty({
    description: 'Timezone for display purposes',
    example: 'America/New_York',
  })
  @IsNotEmpty()
  @IsString()
  timezone!: string;

  @ApiPropertyOptional({
    description: 'Purpose/reason for the appointment',
    example: 'University Application Discussion',
  })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({
    description: 'Additional notes from student',
    example: 'I need help with my Stanford application',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ===== Query DTOs =====
export class AppointmentsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: AppointmentStatusEnum,
    description: 'Filter by appointment status',
  })
  @IsOptional()
  @IsEnum(AppointmentStatusEnum)
  status?: AppointmentStatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by appointments from this date (ISO 8601)',
    example: '2026-03-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointments until this date (ISO 8601)',
    example: '2026-03-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific date (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Filter by staff member ID',
  })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({
    description: 'Filter by student ID',
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;
}

// ===== Cancel Appointment =====
export class CancelAppointmentDto {
  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Schedule conflict - need to reschedule',
  })
  @IsNotEmpty()
  @IsString()
  cancellationReason!: string;
}

// ===== Staff Actions =====
export class ApproveAppointmentDto {
  @ApiPropertyOptional({
    description: 'Internal staff notes (not visible to student)',
    example: 'Confirmed - will prepare Stanford application materials',
  })
  @IsOptional()
  @IsString()
  staffNotes?: string;
}

export class RejectAppointmentDto {
  @ApiProperty({
    description: 'Reason for rejection (visible to student)',
    example: 'Not available at this time. Please select another slot.',
  })
  @IsNotEmpty()
  @IsString()
  rejectionReason!: string;
}

export class CompleteAppointmentDto {
  @ApiPropertyOptional({
    description: 'Post-appointment outcome notes',
    example: 'Reviewed Stanford application. Suggested improvements to personal statement.',
  })
  @IsOptional()
  @IsString()
  outcomeNotes?: string;
}

// ===== Availability Check =====
export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'Staff member ID to check availability for',
  })
  @IsNotEmpty()
  @IsUUID()
  staffId!: string;

  @ApiProperty({
    description: 'Requested start time in ISO 8601 format (UTC)',
    example: '2026-03-01T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({
    description: 'Requested duration in minutes (15-120)',
    example: 60,
    minimum: 15,
    maximum: 120,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(15)
  @Max(120)
  duration!: number;

  @ApiProperty({
    description: 'Timezone for validation',
    example: 'America/New_York',
  })
  @IsNotEmpty()
  @IsString()
  timezone!: string;
}

// ===== Response DTOs =====
export class StaffBasicInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;
}

export class StudentBasicInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;
}

export class AppointmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  scheduledAt!: Date;

  @ApiProperty()
  duration!: number;

  @ApiProperty()
  endTime!: Date;

  @ApiProperty()
  timezone!: string;

  @ApiPropertyOptional()
  purpose?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  staffNotes?: string;

  @ApiProperty({ enum: AppointmentStatusEnum })
  status!: AppointmentStatusEnum;

  @ApiProperty({ enum: AppointmentRequestedByEnum })
  requestedBy!: AppointmentRequestedByEnum;

  @ApiProperty()
  requestedAt!: Date;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  rejectedBy?: string;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  cancelledBy?: string;

  @ApiPropertyOptional()
  cancellationReason?: string;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  outcomeNotes?: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: StaffBasicInfoDto })
  staff?: StaffBasicInfoDto;

  @ApiPropertyOptional({ type: StudentBasicInfoDto })
  student?: StudentBasicInfoDto;
}

export class ConflictingAppointmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  scheduledAt!: Date;

  @ApiProperty()
  endTime!: Date;

  @ApiProperty({ enum: AppointmentStatusEnum })
  status!: AppointmentStatusEnum;
}

export class AvailabilityResponseDto {
  @ApiProperty()
  available!: boolean;

  @ApiProperty()
  scheduledAt!: Date;

  @ApiProperty()
  duration!: number;

  @ApiProperty()
  endTime!: Date;

  @ApiProperty()
  withinWorkingHours!: boolean;

  @ApiPropertyOptional({ type: [ConflictingAppointmentDto] })
  conflicts?: ConflictingAppointmentDto[];

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  workingHours?: {
    dayOfWeek: string;
    openTime: string;
    closeTime: string;
  };
}

export class PaginatedAppointmentsResponseDto {
  @ApiProperty({ type: [AppointmentResponseDto] })
  data!: AppointmentResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

// ===== Staff Dashboard Stats =====
export class StaffDashboardStatsDto {
  @ApiProperty({ description: 'Number of pending approval requests' })
  pendingApprovals!: number;

  @ApiProperty({ description: 'Number of appointments today' })
  todayAppointments!: number;

  @ApiProperty({ description: 'Number of appointments in the next week' })
  upcomingWeekAppointments!: number;

  @ApiProperty({ description: 'Completion rate (completed / (completed + no-show))' })
  completionRate!: number;

  @ApiProperty({ description: 'Average appointment duration in minutes' })
  averageAppointmentDuration!: number;

  @ApiPropertyOptional({ description: 'Next upcoming appointment', type: AppointmentResponseDto })
  nextAppointment?: AppointmentResponseDto;
}
