import {
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
