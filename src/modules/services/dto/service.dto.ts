import { IsString, IsOptional, IsNumber, IsDecimal, IsNotEmpty, IsUUID, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @ApiProperty({ description: 'Service name', example: 'University Application' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Service description', example: 'Complete university application processing' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Service price', example: 500.00 })
  @IsNotEmpty()
  @Type(() => Number)
  price!: number;
}

export class UpdateServiceDto {
  @ApiPropertyOptional({ description: 'Service name', example: 'University Application' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Service description', example: 'Complete university application processing' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Service price', example: 500.00 })
  @IsOptional()
  @Type(() => Number)
  price?: number;
}

export class AssignStudentToServiceDto {
  @ApiProperty({ description: 'Student ID to assign', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  studentId!: string;

  @ApiPropertyOptional({ description: 'Optional notes about the assignment', example: 'Student interested in UK universities' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignMultipleStudentsDto {
  @ApiProperty({ description: 'Array of student IDs to assign', example: ['123e4567-e89b-12d3-a456-426614174000'] })
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds!: string[];

  @ApiPropertyOptional({ description: 'Optional notes about the assignments', example: 'Batch assignment for new students' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UnassignStudentFromServiceDto {
  @ApiProperty({ description: 'Student ID to unassign', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  studentId!: string;
}
