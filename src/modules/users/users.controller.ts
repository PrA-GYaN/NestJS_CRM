import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateRoleDto,
  AssignPermissionsDto,
} from './dto/users.dto';
import {
  AssignPermissionsToRoleDto,
  UpdateRolePermissionsDto,
  RemovePermissionsFromRoleDto,
} from './dto/role-permission.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CanCreate, CanRead, CanUpdate, CanDelete, RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Users & Access Control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @CanCreate('users')
  @ApiOperation({ summary: 'Create new user' })
  createUser(@TenantId() tenantId: string, @Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(tenantId, createUserDto);
  }

  @Get()
  @CanRead('users')
  @ApiOperation({ summary: 'Get all users' })
  getAllUsers(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.usersService.getAllUsers(tenantId, paginationDto);
  }

  @Get(':id')
  @CanRead('users')
  @ApiOperation({ summary: 'Get user by ID' })
  getUserById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.usersService.getUserById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('users')
  @ApiOperation({ summary: 'Update user' })
  updateUser(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(tenantId, params.id, updateUserDto);
  }

  @Delete(':id')
  @CanDelete('users')
  @ApiOperation({ summary: 'Delete user' })
  deleteUser(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.usersService.deleteUser(tenantId, params.id);
  }

  @Post('roles')
  @RequirePermissions('users:manage-roles')
  @ApiOperation({ summary: 'Create new role' })
  createRole(@TenantId() tenantId: string, @Body() createRoleDto: CreateRoleDto) {
    return this.usersService.createRole(tenantId, createRoleDto);
  }

  @Get('roles/list')
  @CanRead('users')
  @ApiOperation({ summary: 'Get all roles' })
  getAllRoles(@TenantId() tenantId: string) {
    return this.usersService.getAllRoles(tenantId);
  }

  @Post('roles/:id/permissions')
  @RequirePermissions('users:manage-roles')
  @ApiOperation({ summary: 'Assign permissions to role' })
  assignPermissions(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.usersService.assignPermissions(tenantId, params.id, dto);
  }

  // ============ Role-Permission Management APIs ============

  @Get('permissions/available')
  @RequirePermissions('users:manage-roles')
  @ApiOperation({
    summary: 'Get all available permissions',
    description: 'Fetch all seeded permissions that can be assigned to roles, grouped by module.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all available permissions grouped by module',
    schema: {
      type: 'object',
      example: {
        leads: [
          { id: 'perm-1', name: 'leads:create', module: 'leads', action: 'create', description: 'Create new leads' },
          { id: 'perm-2', name: 'leads:read', module: 'leads', action: 'read', description: 'View leads' }
        ],
        students: [
          { id: 'perm-3', name: 'students:create', module: 'students', action: 'create', description: 'Create new students' }
        ]
      }
    }
  })
  getAvailablePermissions(@TenantId() tenantId: string) {
    return this.usersService.getAvailablePermissions(tenantId);
  }

  @Post('roles/:roleId/permissions/assign')
  @RequirePermissions('users:manage-roles')
  @ApiOperation({
    summary: 'Assign permissions to a role',
    description: 'Add one or more permissions to a role. Only seeded permissions can be assigned. Duplicate assignments are ignored.',
  })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to assign permissions to', example: 'role-uuid-123' })
  @ApiBody({
    type: AssignPermissionsToRoleDto,
    description: 'Array of permission IDs to assign',
    examples: {
      'Assign multiple permissions': {
        value: {
          permissionIds: ['perm-1', 'perm-2', 'perm-3']
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions assigned successfully',
    schema: {
      type: 'object',
      example: {
        message: 'Successfully assigned 3 permissions to role',
        roleId: 'role-uuid-123',
        assignedCount: 3,
        skippedCount: 0
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Role not found or one or more permissions not found' })
  @ApiResponse({ status: 400, description: 'Invalid permission IDs or empty array provided' })
  assignPermissionsToRole(
    @TenantId() tenantId: string,
    @Param('roleId') roleId: string,
    @Body() dto: AssignPermissionsToRoleDto,
  ) {
    return this.usersService.assignPermissionsToRole(tenantId, roleId, dto);
  }

  @Get('roles/:roleId/permissions')
  @RequirePermissions('users:manage-roles')
  @ApiOperation({
    summary: 'Get all permissions assigned to a role',
    description: 'Fetch all permissions currently assigned to the specified role with details.',
  })
  @ApiParam({ name: 'roleId', description: 'The ID of the role', example: 'role-uuid-123' })
  @ApiResponse({
    status: 200,
    description: 'Returns all permissions assigned to the role',
    schema: {
      type: 'object',
      example: {
        roleId: 'role-uuid-123',
        roleName: 'Manager',
        permissions: [
          {
            id: 'perm-1',
            name: 'leads:create',
            module: 'leads',
            action: 'create',
            description: 'Create new leads',
            assignedAt: '2026-01-21T10:30:00Z'
          },
          {
            id: 'perm-2',
            name: 'leads:read',
            module: 'leads',
            action: 'read',
            description: 'View leads',
            assignedAt: '2026-01-21T10:30:00Z'
          }
        ],
        totalPermissions: 2
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  getRolePermissions(
    @TenantId() tenantId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.usersService.getRolePermissions(tenantId, roleId);
  }

  @Put('roles/:roleId/permissions')
  @RequirePermissions('users:manage-roles')
  @ApiOperation({
    summary: 'Update role permissions',
    description: 'Replace all existing permissions for a role with the provided list. This removes all current permissions and assigns the new ones.',
  })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to update', example: 'role-uuid-123' })
  @ApiBody({
    type: UpdateRolePermissionsDto,
    description: 'Complete list of permission IDs to assign (replaces all existing)',
    examples: {
      'Replace with new permissions': {
        value: {
          permissionIds: ['perm-1', 'perm-5', 'perm-10']
        }
      },
      'Remove all permissions': {
        value: {
          permissionIds: []
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions updated successfully',
    schema: {
      type: 'object',
      example: {
        message: 'Successfully updated permissions for role',
        roleId: 'role-uuid-123',
        removedCount: 5,
        assignedCount: 3,
        totalPermissions: 3
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Role not found or one or more permissions not found' })
  @ApiResponse({ status: 400, description: 'Invalid permission IDs provided' })
  updateRolePermissions(
    @TenantId() tenantId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.usersService.updateRolePermissions(tenantId, roleId, dto);
  }

  @Delete('roles/:roleId/permissions')
  @RequirePermissions('users:manage-roles')
  @ApiOperation({
    summary: 'Remove permissions from a role',
    description: 'Remove one or more specific permissions from a role. Other permissions remain unchanged.',
  })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to remove permissions from', example: 'role-uuid-123' })
  @ApiBody({
    type: RemovePermissionsFromRoleDto,
    description: 'Array of permission IDs to remove',
    examples: {
      'Remove multiple permissions': {
        value: {
          permissionIds: ['perm-1', 'perm-2']
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions removed successfully',
    schema: {
      type: 'object',
      example: {
        message: 'Successfully removed 2 permissions from role',
        roleId: 'role-uuid-123',
        removedCount: 2,
        remainingPermissions: 5
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Role not found or one or more permissions not found' })
  @ApiResponse({ status: 400, description: 'Invalid permission IDs or empty array provided' })
  removePermissionsFromRole(
    @TenantId() tenantId: string,
    @Param('roleId') roleId: string,
    @Body() dto: RemovePermissionsFromRoleDto,
  ) {
    return this.usersService.removePermissionsFromRole(tenantId, roleId, dto);
  }
}
