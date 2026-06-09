import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsInt,
  IsPositive,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/common.dto';

export enum StaffStatusEnum {
  Available = 'Available',
  Busy = 'Busy',
  OnLeave = 'OnLeave',
  Offline = 'Offline',
}

export enum StaffTypeEnum {
  Counselor = 'Counselor',
  AdmissionOfficer = 'AdmissionOfficer',
  VisaOfficer = 'VisaOfficer',
  DocumentationOfficer = 'DocumentationOfficer',
  FinanceOfficer = 'FinanceOfficer',
  Other = 'Other',
}

export class CreateStaffProfileDto {
  @ApiProperty({ description: 'User ID to create staff profile for' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: StaffTypeEnum })
  @IsEnum(StaffTypeEnum)
  staffType!: StaffTypeEnum;

  @ApiPropertyOptional({ enum: StaffStatusEnum })
  @IsOptional()
  @IsEnum(StaffStatusEnum)
  status?: StaffStatusEnum;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(500)
  @Type(() => Number)
  maxWorkload?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}

export class UpdateStaffProfileDto {
  @ApiPropertyOptional({ enum: StaffStatusEnum })
  @IsOptional()
  @IsEnum(StaffStatusEnum)
  status?: StaffStatusEnum;

  @ApiPropertyOptional({ enum: StaffTypeEnum })
  @IsOptional()
  @IsEnum(StaffTypeEnum)
  staffType?: StaffTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(500)
  @Type(() => Number)
  maxWorkload?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}

export class StaffQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StaffTypeEnum })
  @IsOptional()
  @IsEnum(StaffTypeEnum)
  staffType?: StaffTypeEnum;

  @ApiPropertyOptional({ enum: StaffStatusEnum })
  @IsOptional()
  @IsEnum(StaffStatusEnum)
  status?: StaffStatusEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class StaffWorkloadResponseDto {
  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: StaffTypeEnum })
  staffType!: StaffTypeEnum;

  @ApiProperty({ enum: StaffStatusEnum })
  status!: StaffStatusEnum;

  @ApiProperty()
  activeLeads!: number;

  @ApiProperty()
  openTasks!: number;

  @ApiProperty()
  pendingFollowUps!: number;

  @ApiProperty()
  todayCalls!: number;

  @ApiProperty()
  todayMeetings!: number;

  @ApiProperty()
  queueLoad!: number;

  @ApiProperty()
  currentWorkload!: number;

  @ApiProperty()
  maxWorkload!: number;

  @ApiProperty()
  workloadPercentage!: number;
}

export class StaffDashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffId?: string;
}
