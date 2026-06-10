import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  ArrayMinSize,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * A permission ID with optional scope override
 */
export class PermissionWithScopeDto {
  @ApiProperty({
    description: 'Permission ID',
    example: 'perm-123',
  })
  @IsString()
  @IsNotEmpty()
  permissionId!: string;

  @ApiPropertyOptional({
    description: 'Scope override for this specific permission (defaults to the role-level defaultScope)',
    enum: ['own', 'full'],
    example: 'full',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['own', 'full'])
  scope?: string;
}

/**
 * DTO for assigning permissions to a role
 */
export class AssignPermissionsToRoleDto {
  @ApiProperty({
    description: 'Array of permission IDs to assign to the role',
    example: ['perm-123', 'perm-456'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one permission ID is required' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionIds!: string[];

  @ApiPropertyOptional({
    description: 'Default scope to apply to all assigned permissions',
    enum: ['own', 'full'],
    default: 'full',
    example: 'full',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['own', 'full'])
  defaultScope?: string;
}

/**
 * DTO for updating all permissions for a role (replaces existing)
 */
export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: 'Array of permission objects or IDs that will replace current role permissions',
    oneOf: [
      {
        type: 'array',
        items: { type: 'string' },
        example: ['perm-123', 'perm-456'],
      },
      {
        type: 'array',
        items: { $ref: '#/components/schemas/PermissionWithScopeDto' },
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(0)
  permissionIds!: string[];

  @ApiPropertyOptional({
    description: 'Default scope to apply to all permissions',
    enum: ['own', 'full'],
    default: 'full',
    example: 'full',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['own', 'full'])
  defaultScope?: string;

  @ApiPropertyOptional({
    description: 'Detailed permission assignments with per-permission scope overrides',
    type: [PermissionWithScopeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionWithScopeDto)
  permissions?: PermissionWithScopeDto[];
}

/**
 * DTO for removing permissions from a role
 */
export class RemovePermissionsFromRoleDto {
  @ApiProperty({
    description: 'Array of permission IDs to remove from the role',
    example: ['perm-123', 'perm-456'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one permission ID is required' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionIds!: string[];
}
