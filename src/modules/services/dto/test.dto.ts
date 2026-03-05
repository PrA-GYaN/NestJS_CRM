import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TestType {
  IELTS = 'IELTS',
  TOEFL = 'TOEFL',
  GRE = 'GRE',
  GMAT = 'GMAT',
  SAT = 'SAT',
  Other = 'Other',
}

export class CreateTestDto {
  @ApiProperty({ description: 'Test name', example: 'IELTS Academic' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: TestType, description: 'Test type' })
  @IsEnum(TestType)
  @IsNotEmpty()
  type!: TestType;

  @ApiPropertyOptional({ description: 'Test description', example: 'International English Language Testing System' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTestDto {
  @ApiPropertyOptional({ description: 'Test name', example: 'IELTS Academic' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: TestType, description: 'Test type' })
  @IsOptional()
  @IsEnum(TestType)
  type?: TestType;

  @ApiPropertyOptional({ description: 'Test description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignTestToStudentDto {
  @ApiProperty({ description: 'Student ID to assign the test to', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;
}

export class UpdateTestAssignmentDto {
  @ApiPropertyOptional({ enum: ['Pending', 'Completed', 'Graded'], description: 'Assignment status' })
  @IsOptional()
  @IsEnum(['Pending', 'Completed', 'Graded'])
  status?: 'Pending' | 'Completed' | 'Graded';

  @ApiPropertyOptional({ description: 'Score achieved (0–100)', example: 85.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  score?: number;
}
