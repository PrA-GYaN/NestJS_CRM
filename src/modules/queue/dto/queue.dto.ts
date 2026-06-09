import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsInt,
  IsPositive,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/common.dto';

export enum QueueTypeEnum {
  NewLead = 'NewLead',
  RevisitLead = 'RevisitLead',
  ManualAssignment = 'ManualAssignment',
}

export enum QueueItemStatusEnum {
  Waiting = 'Waiting',
  Assigned = 'Assigned',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Skipped = 'Skipped',
  Reassigned = 'Reassigned',
}

export enum AssignmentReasonEnum {
  InitialAssignment = 'InitialAssignment',
  AutomaticAssignment = 'AutomaticAssignment',
  ManualAssignment = 'ManualAssignment',
  Reassignment = 'Reassignment',
  RevisitAssignment = 'RevisitAssignment',
}

export class CreateQueueDto {
  @ApiProperty({ enum: QueueTypeEnum })
  @IsEnum(QueueTypeEnum)
  type!: QueueTypeEnum;

  @ApiProperty({ description: 'Queue display name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateQueueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueueQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: QueueTypeEnum })
  @IsOptional()
  @IsEnum(QueueTypeEnum)
  type?: QueueTypeEnum;
}

export class AddToQueueDto {
  @ApiProperty({ description: 'Lead ID to add to queue' })
  @IsUUID()
  leadId!: string;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueueItemQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: QueueItemStatusEnum })
  @IsOptional()
  @IsEnum(QueueItemStatusEnum)
  status?: QueueItemStatusEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string;
}

export class AssignQueueItemDto {
  @ApiProperty({ description: 'Staff profile ID to assign to' })
  @IsUUID()
  staffProfileId!: string;

  @ApiPropertyOptional({ description: 'Assignment note' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ReassignQueueItemDto {
  @ApiProperty({ description: 'New staff profile ID' })
  @IsUUID()
  toStaffProfileId!: string;

  @ApiPropertyOptional({ description: 'Reassignment reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateQueueItemStatusDto {
  @ApiProperty({ enum: QueueItemStatusEnum })
  @IsEnum(QueueItemStatusEnum)
  status!: QueueItemStatusEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueueAnalyticsDto {
  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  waiting!: number;

  @ApiProperty()
  assigned!: number;

  @ApiProperty()
  inProgress!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty()
  avgWaitTimeHours!: number;

  @ApiProperty()
  avgProcessingTimeHours!: number;
}

export class AssignmentHistoryQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ enum: AssignmentReasonEnum })
  @IsOptional()
  @IsEnum(AssignmentReasonEnum)
  reason?: AssignmentReasonEnum;
}
