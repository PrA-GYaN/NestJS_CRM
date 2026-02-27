import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';

export class CreateWorkflowStepDto {
  @ApiProperty({
    description: 'Step name',
    example: 'Document Collection',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Step description',
    example: 'Collect all required documents from the student',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Step order in the workflow',
    example: 1,
  })
  @IsInt()
  @Min(1)
  stepOrder!: number;

  @ApiProperty({
    description: 'Whether this step requires document upload',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  requiresDocument?: boolean;

  @ApiProperty({
    description: 'Whether the step is active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Expected duration in days (SLA)',
    example: 3,
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  expectedDurationDays?: number;
}
