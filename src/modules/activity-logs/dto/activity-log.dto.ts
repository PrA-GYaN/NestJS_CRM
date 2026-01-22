import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ActivityAction {
  Created = 'Created',
  Updated = 'Updated',
  Deleted = 'Deleted',
  StatusChanged = 'StatusChanged',
  Assigned = 'Assigned',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Login = 'Login',
  Logout = 'Logout',
  AccessDenied = 'AccessDenied',
}

export class CreateActivityLogDto {
  @ApiPropertyOptional({
    description: 'User ID who performed the action (optional for system actions)',
    example: 'uuid-string',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Type of entity affected',
    example: 'Task',
  })
  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @ApiProperty({
    description: 'ID of the entity affected',
    example: 'uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @ApiProperty({
    description: 'Action performed',
    enum: ActivityAction,
    example: ActivityAction.Created,
  })
  @IsEnum(ActivityAction)
  @IsNotEmpty()
  action!: ActivityAction;

  @ApiPropertyOptional({
    description: 'JSON diff of changes (before/after)',
    example: { before: { status: 'Pending' }, after: { status: 'Completed' } },
  })
  @IsObject()
  @IsOptional()
  changes?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ActivityLogResponseDto {
  @ApiProperty({ example: 'uuid-string' })
  id!: string;

  @ApiProperty({ example: 'uuid-string' })
  tenantId!: string;

  @ApiPropertyOptional({ example: 'uuid-string' })
  userId?: string;

  @ApiProperty({ example: 'Task' })
  entityType!: string;

  @ApiProperty({ example: 'uuid-string' })
  entityId!: string;

  @ApiProperty({ enum: ActivityAction })
  action!: ActivityAction;

  @ApiPropertyOptional({
    example: { before: { status: 'Pending' }, after: { status: 'Completed' } },
  })
  changes?: Record<string, any>;

  @ApiPropertyOptional({
    example: { ipAddress: '192.168.1.1' },
  })
  metadata?: Record<string, any>;

  @ApiProperty()
  timestamp!: Date;

  @ApiPropertyOptional({
    description: 'User who performed the action',
    type: 'object',
  })
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export class ActivityLogFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'uuid-string',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity type',
    example: 'Task',
  })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
    example: 'uuid-string',
  })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by action',
    enum: ActivityAction,
  })
  @IsEnum(ActivityAction)
  @IsOptional()
  action?: ActivityAction;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO format)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  toDate?: string;
}
