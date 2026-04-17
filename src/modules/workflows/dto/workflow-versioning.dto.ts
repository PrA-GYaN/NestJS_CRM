import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID, IsEnum, IsArray, IsNumber, Min, ValidateNested, Type } from 'class-validator';

export enum WorkflowVersionStatus {
  Draft = 'Draft',
  Active = 'Active',
  Deprecated = 'Deprecated',
  Archived = 'Archived',
}

export enum MigrationStrategyDto {
  KeepCurrentStep = 'KeepCurrentStep',
  RemapStep = 'RemapStep',
  ForcedUpdate = 'ForcedUpdate',
}

// ============================================
// WORKFLOW VERSION MANAGEMENT DTOs
// ============================================

export class VersionStepDto {
  @ApiProperty({
    description: 'Step name',
    example: 'Document Collection',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Step description',
    example: 'Collect all required documents',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Step order in the workflow',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  stepOrder!: number;

  @ApiPropertyOptional({
    description: 'Whether this step requires a document',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  requiresDocument?: boolean;

  @ApiPropertyOptional({
    description: 'Expected duration in days for this step (SLA)',
    example: 7,
  })
  @IsNumber()
  @IsOptional()
  expectedDurationDays?: number;

  @ApiPropertyOptional({
    description: 'Whether this step is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateWorkflowVersionDto {
  @ApiProperty({
    description: 'Workflow ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  workflowId!: string;

  @ApiPropertyOptional({
    description: 'Version description - what changed in this version',
    example: 'Updated document requirements for Australian visas',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Workflow steps for this version',
    type: [VersionStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VersionStepDto)
  steps!: VersionStepDto[];
}

export class CreateVersionFromCurrentDto {
  @ApiProperty({
    description: 'Workflow ID to create a version from',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  workflowId!: string;

  @ApiPropertyOptional({
    description: 'Description of changes in this new version',
    example: 'Minor updates to step requirements',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ActivateWorkflowVersionDto {
  @ApiProperty({
    description: 'Workflow version ID to activate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  versionId!: string;
}

export class DeprecateWorkflowVersionDto {
  @ApiProperty({
    description: 'Workflow version ID to deprecate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  versionId!: string;

  @ApiPropertyOptional({
    description: 'Reason for deprecation',
    example: 'Outdated process, replaced by v2',
  })
  @IsString()
  @IsOptional()
  deprecatedReason?: string;

  @ApiPropertyOptional({
    description: 'Whether to allow migration of existing applications',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  allowMigration?: boolean;
}

// ============================================
// STEP MAPPING DTOs
// ============================================

export class StepMappingDto {
  @ApiProperty({
    description: 'Old step ID (from older version)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  fromStepId!: string;

  @ApiProperty({
    description: 'New step ID (in newer version)',
    example: '223e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  toStepId!: string;

  @ApiPropertyOptional({
    description: 'Is this mapping compatible for auto-migration?',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isCompatible?: boolean;

  @ApiPropertyOptional({
    description: 'Why are these steps mapped?',
    example: 'Step renamed from "Collection" to "Document Collection"',
  })
  @IsString()
  @IsOptional()
  mappingReason?: string;
}

export class DefineStepMappingDto {
  @ApiProperty({
    description: 'From workflow version ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  fromVersionId!: string;

  @ApiProperty({
    description: 'To workflow version ID',
    example: '223e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  toVersionId!: string;

  @ApiProperty({
    description: 'Array of step mappings',
    type: [StepMappingDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepMappingDto)
  mappings!: StepMappingDto[];
}

// ============================================
// MERGE VERSION OPERATION DTOs
// ============================================

export class MergeWorkflowVersionsDto {
  @ApiProperty({
    description: 'Source workflow version ID to merge from',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  sourceVersionId!: string;

  @ApiProperty({
    description: 'Target workflow version ID to merge into',
    example: '223e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  targetVersionId!: string;

  @ApiPropertyOptional({
    description: 'Description of the merge operation',
    example: 'Merged Australian and NZ visa requirements',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Steps to include from source (by step IDs). If empty, includes all.',
    example: ['step-1', 'step-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  includeStepIds?: string[];

  @ApiPropertyOptional({
    description: 'How to resolve conflicts: keep source, keep target, or manual',
    example: 'keep-target',
  })
  @IsString()
  @IsOptional()
  conflictResolution?: 'keep-source' | 'keep-target' | 'manual';
}

// ============================================
// APPLICATION MIGRATION DTOs
// ============================================

export class MigrateApplicationDto {
  @ApiProperty({
    description: 'Visa application ID to migrate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  applicationId!: string;

  @ApiProperty({
    description: 'Target workflow version ID',
    example: '223e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  toVersionId!: string;

  @ApiProperty({
    description: 'Migration strategy',
    enum: MigrationStrategyDto,
  })
  @IsEnum(MigrationStrategyDto)
  strategy!: MigrationStrategyDto;

  @ApiPropertyOptional({
    description: 'Target step ID (required for RemapStep strategy)',
    example: '323e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  @IsOptional()
  targetStepId?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the migration',
    example: 'Migrated due to policy update',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkMigrateApplicationsDto {
  @ApiProperty({
    description: 'From workflow version ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  fromVersionId!: string;

  @ApiProperty({
    description: 'To workflow version ID',
    example: '223e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  toVersionId!: string;

  @ApiProperty({
    description: 'Migration strategy to use for all applications',
    enum: MigrationStrategyDto,
  })
  @IsEnum(MigrationStrategyDto)
  strategy!: MigrationStrategyDto;

  @ApiPropertyOptional({
    description: 'Application status filters (e.g., "Pending", "InProgress")',
    example: ['Pending', 'Submitted'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  statusFilters?: string[];

  @ApiPropertyOptional({
    description: 'Whether to validate step mappings before migration',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  validateMappings?: boolean;
}

export class ForcedMigrationDto extends BulkMigrateApplicationsDto {
  @ApiProperty({
    description: 'Whether to force migration even if mappings are incomplete',
    example: true,
  })
  @IsBoolean()
  force!: boolean;

  @ApiPropertyOptional({
    description: 'Admin-only: reason for forced migration',
    example: 'Critical policy update required',
  })
  @IsString()
  @IsOptional()
  adminReason?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class WorkflowVersionStepResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  stepOrder!: number;

  @ApiProperty()
  requiresDocument!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  expectedDurationDays?: number | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class WorkflowVersionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workflowId!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty()
  status!: WorkflowVersionStatus;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ type: [WorkflowVersionStepResponseDto] })
  steps!: WorkflowVersionStepResponseDto[];

  @ApiProperty()
  applicationCount!: number;

  @ApiPropertyOptional()
  createdBy?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  deprecatedAt?: Date | null;

  @ApiPropertyOptional()
  deprecatedReason?: string | null;
}

export class VersionAnalyticsDto {
  @ApiProperty()
  versionId!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty()
  status!: WorkflowVersionStatus;

  @ApiProperty({
    description: 'Number of applications currently using this version',
  })
  applicationsInUse!: number;

  @ApiProperty({
    description: 'Number of applications completed with this version',
  })
  applicationsCompleted!: number;

  @ApiProperty({
    description: 'Number of pending migrations from this version',
  })
  pendingMigrations!: number;

  @ApiProperty({
    description: 'Percentage of applications that have successfully completed',
  })
  successRate!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  deprecatedAt?: Date | null;

  @ApiPropertyOptional()
  canBeDeleted!: boolean;
}

export class MigrationStatusDto {
  @ApiProperty()
  migrationId!: string;

  @ApiProperty()
  fromVersionNumber!: number;

  @ApiProperty()
  toVersionNumber!: number;

  @ApiProperty()
  strategy!: MigrationStrategyDto;

  @ApiProperty()
  totalApplications!: number;

  @ApiProperty()
  completedMigrations!: number;

  @ApiProperty()
  failedMigrations!: number;

  @ApiProperty()
  pendingMigrations!: number;

  @ApiPropertyOptional()
  appliedAt?: Date | null;

  @ApiPropertyOptional()
  completionPercentage!: number;
}
