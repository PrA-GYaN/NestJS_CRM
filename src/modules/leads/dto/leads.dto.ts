import {
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/common.dto';

export enum LeadStatusEnum {
  New = 'New',
  Contacted = 'Contacted',
  Qualified = 'Qualified',
  Converted = 'Converted',
  NotInterested = 'NotInterested',
  NotReachable = 'NotReachable',
}

export enum PriorityEnum {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export class LeadsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: LeadStatusEnum, description: 'Filter by lead status' })
  @IsOptional()
  @IsEnum(LeadStatusEnum)
  status?: LeadStatusEnum;

  @ApiPropertyOptional({ enum: PriorityEnum, description: 'Filter by priority' })
  @IsOptional()
  @IsEnum(PriorityEnum)
  priority?: PriorityEnum;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({ description: 'Filter by source' })
  @IsOptional()
  @IsString()
  source?: string;
}

export class CreateLeadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicBackground?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studyInterests?: string;

  @ApiPropertyOptional({ enum: ['High', 'Medium', 'Low'] })
  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  priority?: 'High' | 'Medium' | 'Low';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicBackground?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studyInterests?: string;

  @ApiPropertyOptional({ enum: ['New', 'Contacted', 'Qualified', 'Converted', 'NotInterested', 'NotReachable'] })
  @IsOptional()
  @IsEnum(['New', 'Contacted', 'Qualified', 'Converted', 'NotInterested', 'NotReachable'])
  status?: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'NotInterested' | 'NotReachable';

  @ApiPropertyOptional({ enum: ['High', 'Medium', 'Low'] })
  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  priority?: 'High' | 'Medium' | 'Low';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}

export class ConvertLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  academicRecords?: any;

  @ApiPropertyOptional()
  @IsOptional()
  testScores?: any;
}
