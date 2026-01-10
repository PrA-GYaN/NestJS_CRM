import {
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
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
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  academicRecords?: any;

  @ApiPropertyOptional()
  @IsOptional()
  testScores?: any;

  @ApiPropertyOptional({ enum: ['High', 'Medium', 'Low'] })
  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  priority?: 'High' | 'Medium' | 'Low';
}

export class UpdateStudentDto {
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
  academicRecords?: any;

  @ApiPropertyOptional()
  @IsOptional()
  testScores?: any;

  @ApiPropertyOptional({ enum: ['Prospective', 'Enrolled', 'Alumni'] })
  @IsOptional()
  @IsEnum(['Prospective', 'Enrolled', 'Alumni'])
  status?: 'Prospective' | 'Enrolled' | 'Alumni';

  @ApiPropertyOptional({ enum: ['High', 'Medium', 'Low'] })
  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low'])
  priority?: 'High' | 'Medium' | 'Low';
}

export class UploadDocumentDto {
  @ApiProperty({ enum: ['Passport', 'Transcript', 'VisaForm', 'Photo', 'Certificate', 'Other'] })
  @IsEnum(['Passport', 'Transcript', 'VisaForm', 'Photo', 'Certificate', 'Other'])
  documentType!: 'Passport' | 'Transcript' | 'VisaForm' | 'Photo' | 'Certificate' | 'Other';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  filePath!: string;
}
