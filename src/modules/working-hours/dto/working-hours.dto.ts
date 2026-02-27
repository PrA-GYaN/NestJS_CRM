import {
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DayOfWeekEnum {
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
  Saturday = 'Saturday',
  Sunday = 'Sunday',
}

export class CreateWorkingHoursDto {
  @ApiProperty({
    enum: DayOfWeekEnum,
    description: 'Day of the week',
    example: 'Monday',
  })
  @IsNotEmpty()
  @IsEnum(DayOfWeekEnum)
  dayOfWeek!: DayOfWeekEnum;

  @ApiProperty({
    description: 'Whether the office is open on this day',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  isOpen!: boolean;

  @ApiPropertyOptional({
    description: 'Opening time in 24-hour format (HH:MM)',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'openTime must be in HH:MM format (24-hour)',
  })
  openTime?: string;

  @ApiPropertyOptional({
    description: 'Closing time in 24-hour format (HH:MM)',
    example: '17:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'closeTime must be in HH:MM format (24-hour)',
  })
  closeTime?: string;

  @ApiProperty({
    description: 'IANA timezone identifier',
    example: 'America/New_York',
  })
  @IsNotEmpty()
  @IsString()
  timezone!: string;
}

export class UpdateWorkingHoursDto {
  @ApiPropertyOptional({
    enum: DayOfWeekEnum,
    description: 'Day of the week',
  })
  @IsOptional()
  @IsEnum(DayOfWeekEnum)
  dayOfWeek?: DayOfWeekEnum;

  @ApiPropertyOptional({
    description: 'Whether the office is open on this day',
  })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @ApiPropertyOptional({
    description: 'Opening time in 24-hour format (HH:MM)',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'openTime must be in HH:MM format (24-hour)',
  })
  openTime?: string;

  @ApiPropertyOptional({
    description: 'Closing time in 24-hour format (HH:MM)',
    example: '17:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'closeTime must be in HH:MM format (24-hour)',
  })
  closeTime?: string;

  @ApiPropertyOptional({
    description: 'IANA timezone identifier',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Whether this working hours configuration is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkWorkingHoursDto {
  @ApiProperty({
    description: 'IANA timezone identifier for all schedule entries',
    example: 'America/New_York',
  })
  @IsNotEmpty()
  @IsString()
  timezone!: string;

  @ApiProperty({
    description: 'Array of working hours for each day',
    type: [CreateWorkingHoursDto],
  })
  @IsNotEmpty()
  schedule!: Omit<CreateWorkingHoursDto, 'timezone'>[];
}

export class WorkingHoursQueryDto {
  @ApiPropertyOptional({
    enum: DayOfWeekEnum,
    description: 'Filter by day of week',
  })
  @IsOptional()
  @IsEnum(DayOfWeekEnum)
  dayOfWeek?: DayOfWeekEnum;

  @ApiPropertyOptional({
    description: 'Filter by open days only',
  })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;
}

export class WorkingHoursResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: DayOfWeekEnum })
  dayOfWeek!: DayOfWeekEnum;

  @ApiProperty()
  isOpen!: boolean;

  @ApiProperty()
  openTime!: string;

  @ApiProperty()
  closeTime!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
