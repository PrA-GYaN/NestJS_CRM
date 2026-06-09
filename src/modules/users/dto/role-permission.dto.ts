import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';

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
}

/**
 * DTO for updating all permissions for a role (replaces existing)
 */
export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: 'Array of permission IDs that will replace current role permissions',
    example: ['perm-123', 'perm-456', 'perm-789'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionIds!: string[];
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
