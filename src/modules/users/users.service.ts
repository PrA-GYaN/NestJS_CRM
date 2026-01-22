import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionsDto,
} from './dto/users.dto';
import {
  AssignPermissionsToRoleDto,
  UpdateRolePermissionsDto,
  RemovePermissionsFromRoleDto,
} from './dto/role-permission.dto';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class UsersService {
  constructor(
    private tenantService: TenantService,
    private authService: AuthService,
  ) {}

  async createUser(tenantId: string, createUserDto: CreateUserDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const existingUser = await tenantPrisma.user.findFirst({
      where: { tenantId, email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Verify the role exists
    const role = await tenantPrisma.role.findFirst({
      where: { id: createUserDto.roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Prevent assigning SUPER_ADMIN role to new users
    if (this.isSuperAdminRole(role.name)) {
      throw new BadRequestException('SUPER_ADMIN role cannot be manually assigned to users. Only the first user created during tenant provisioning has this role.');
    }

    const hashedPassword = await this.authService.hashPassword(createUserDto.password);

    return tenantPrisma.user.create({
      data: {
        ...createUserDto,
        tenantId,
        password: hashedPassword,
      },
      include: {
        role: true,
      },
    });
  }

  async getAllUsers(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { email: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      tenantPrisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { role: true },
      }),
      tenantPrisma.user.count({ where }),
    ]);

    return {
      data: users.map(({ password, ...user }: any) => user),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const user = await tenantPrisma.user.findFirst({
      where: { id, tenantId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(tenantId: string, id: string, updateUserDto: UpdateUserDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const user = await this.getUserById(tenantId, id);

    // If role is being changed, validate it
    if (updateUserDto.roleId && updateUserDto.roleId !== user.roleId) {
      const currentRole = await tenantPrisma.role.findUnique({
        where: { id: user.roleId },
      });

      const newRole = await tenantPrisma.role.findFirst({
        where: { id: updateUserDto.roleId, tenantId },
      });

      if (!newRole) {
        throw new NotFoundException('New role not found');
      }

      // Prevent removing SUPER_ADMIN role from a user
      if (currentRole && this.isSuperAdminRole(currentRole.name)) {
        throw new BadRequestException('Cannot change role for users with SUPER_ADMIN role');
      }

      // Prevent assigning SUPER_ADMIN role to a user
      if (this.isSuperAdminRole(newRole.name)) {
        throw new BadRequestException('SUPER_ADMIN role cannot be manually assigned to users');
      }
    }

    return tenantPrisma.user.update({
      where: { id },
      data: updateUserDto,
      include: { role: true },
    });
  }

  async deleteUser(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getUserById(tenantId, id);

    await tenantPrisma.user.delete({
      where: { id },
    });

    return { success: true, message: 'User deleted successfully' };
  }

  // Role Management
  async createRole(tenantId: string, createRoleDto: CreateRoleDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Prevent manual creation of SUPER_ADMIN role
    if (createRoleDto.name.toUpperCase() === 'SUPER_ADMIN' || createRoleDto.name.toUpperCase().replace(/[_\s-]/g, '') === 'SUPERADMIN') {
      throw new BadRequestException('SUPER_ADMIN role cannot be created manually. It is automatically created during tenant provisioning.');
    }

    // Check for case-insensitive duplicate role names
    const existingRole = await tenantPrisma.role.findFirst({
      where: { 
        tenantId, 
        name: {
          equals: createRoleDto.name,
          mode: 'insensitive'
        } 
      },
    });

    if (existingRole) {
      throw new ConflictException('Role name already exists');
    }

    return tenantPrisma.role.create({
      data: {
        ...createRoleDto,
        tenantId,
      },
    });
  }

  async getAllRoles(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    return tenantPrisma.role.findMany({
      where: { tenantId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async assignPermissions(tenantId: string, roleId: string, dto: AssignPermissionsDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Remove existing permissions
    await tenantPrisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Add new permissions
    const rolePermissions = dto.permissionIds.map((permissionId) => ({
      tenantId,
      roleId,
      permissionId,
    }));

    await tenantPrisma.rolePermission.createMany({
      data: rolePermissions,
    });

    return { success: true, message: 'Permissions assigned successfully' };
  }

  // ============ Role-Permission Management APIs ============

  /**
   * Get all available permissions (seeded permissions that can be assigned)
   */
  async getAvailablePermissions(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const permissions = await tenantPrisma.permission.findMany({
      where: { tenantId },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Group by module for better organization
    const groupedByModule = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push({
        id: permission.id,
        name: permission.name,
        action: permission.action,
        description: permission.description,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return {
      totalPermissions: permissions.length,
      modules: Object.keys(groupedByModule).length,
      permissions: groupedByModule,
    };
  }

  /**
   * Assign permissions to a role (add to existing permissions)
   */
  async assignPermissionsToRole(
    tenantId: string,
    roleId: string,
    dto: AssignPermissionsToRoleDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify role exists
    const role = await tenantPrisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Prevent modifying SUPER_ADMIN role permissions
    if (this.isSuperAdminRole(role.name)) {
      throw new BadRequestException('SUPER_ADMIN role permissions cannot be modified');
    }

    // Verify all permissions exist
    const permissions = await tenantPrisma.permission.findMany({
      where: {
        id: { in: dto.permissionIds },
        tenantId,
      },
    });

    if (permissions.length !== dto.permissionIds.length) {
      const foundIds = permissions.map((p) => p.id);
      const notFound = dto.permissionIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `The following permission IDs do not exist: ${notFound.join(', ')}`,
      );
    }

    // Get existing role-permission associations
    const existingAssociations = await tenantPrisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: { in: dto.permissionIds },
      },
    });

    const existingPermissionIds = existingAssociations.map((rp) => rp.permissionId);
    const newPermissionIds = dto.permissionIds.filter(
      (id) => !existingPermissionIds.includes(id),
    );

    // Add new associations only
    if (newPermissionIds.length > 0) {
      const rolePermissions = newPermissionIds.map((permissionId) => ({
        tenantId,
        roleId,
        permissionId,
      }));

      await tenantPrisma.rolePermission.createMany({
        data: rolePermissions,
      });
    }

    return {
      success: true,
      message: `${newPermissionIds.length} permission(s) assigned to role successfully`,
      alreadyAssigned: existingPermissionIds.length,
      newlyAssigned: newPermissionIds.length,
    };
  }

  /**
   * Get all permissions assigned to a specific role
   */
  async getRolePermissions(tenantId: string, roleId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify role exists
    const role = await tenantPrisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    return {
      roleId: role.id,
      roleName: role.name,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        module: rp.permission.module,
        action: rp.permission.action,
        description: rp.permission.description,
        assignedAt: rp.createdAt,
      })),
      totalPermissions: role.rolePermissions.length,
    };
  }

  /**
   * Update permissions for a role (replace all existing permissions)
   */
  async updateRolePermissions(
    tenantId: string,
    roleId: string,
    dto: UpdateRolePermissionsDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify role exists
    const role = await tenantPrisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Prevent modifying SUPER_ADMIN role permissions
    if (this.isSuperAdminRole(role.name)) {
      throw new BadRequestException('SUPER_ADMIN role permissions cannot be modified');
    }

    // Verify all permissions exist
    const permissions = await tenantPrisma.permission.findMany({
      where: {
        id: { in: dto.permissionIds },
        tenantId,
      },
    });

    if (permissions.length !== dto.permissionIds.length) {
      const foundIds = permissions.map((p) => p.id);
      const notFound = dto.permissionIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `The following permission IDs do not exist: ${notFound.join(', ')}`,
      );
    }

    // Remove all existing permissions
    await tenantPrisma.rolePermission.deleteMany({
      where: { roleId, tenantId },
    });

    // Add new permissions
    if (dto.permissionIds.length > 0) {
      const rolePermissions = dto.permissionIds.map((permissionId) => ({
        tenantId,
        roleId,
        permissionId,
      }));

      await tenantPrisma.rolePermission.createMany({
        data: rolePermissions,
      });
    }

    return {
      success: true,
      message: `Role permissions updated successfully`,
      totalPermissions: dto.permissionIds.length,
    };
  }

  /**
   * Remove specific permissions from a role
   */
  async removePermissionsFromRole(
    tenantId: string,
    roleId: string,
    dto: RemovePermissionsFromRoleDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify role exists and is not SUPER_ADMIN
    const role = await tenantPrisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Prevent modifying SUPER_ADMIN role
    if (this.isSuperAdminRole(role.name)) {
      throw new BadRequestException('SUPER_ADMIN role permissions cannot be modified');
    }

    // Delete the specified role-permission associations
    const result = await tenantPrisma.rolePermission.deleteMany({
      where: {
        roleId,
        tenantId,
        permissionId: { in: dto.permissionIds },
      },
    });

    return {
      success: true,
      message: `${result.count} permission(s) removed from role successfully`,
      removedCount: result.count,
    };
  }

  /**
   * Update a role's basic information (name, description)
   */
  async updateRole(tenantId: string, roleId: string, updateRoleDto: UpdateRoleDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify role exists
    const role = await tenantPrisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Prevent updating SUPER_ADMIN role
    if (this.isSuperAdminRole(role.name)) {
      throw new BadRequestException('SUPER_ADMIN role cannot be modified');
    }

    // If name is being changed, check for duplicates
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      // Prevent renaming to SUPER_ADMIN
      if (this.isSuperAdminRole(updateRoleDto.name)) {
        throw new BadRequestException('Cannot rename role to SUPER_ADMIN');
      }

      const existingRole = await tenantPrisma.role.findFirst({
        where: { 
          tenantId, 
          name: {
            equals: updateRoleDto.name,
            mode: 'insensitive'
          },
          id: { not: roleId },
        },
      });

      if (existingRole) {
        throw new ConflictException('Role name already exists');
      }
    }

    return tenantPrisma.role.update({
      where: { id: roleId },
      data: updateRoleDto,
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Delete a role
   */
  async deleteRole(tenantId: string, roleId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify role exists
    const role = await tenantPrisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Prevent deleting SUPER_ADMIN role
    if (this.isSuperAdminRole(role.name)) {
      throw new BadRequestException('SUPER_ADMIN role cannot be deleted');
    }

    // Check if any users are assigned to this role
    const usersWithRole = await tenantPrisma.user.count({
      where: { roleId, tenantId },
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role. ${usersWithRole} user(s) are currently assigned to this role.`,
      );
    }

    await tenantPrisma.role.delete({
      where: { id: roleId },
    });

    return { success: true, message: 'Role deleted successfully' };
  }

  /**
   * Check if a role name is SUPER_ADMIN (case-insensitive, handles variations)
   */
  private isSuperAdminRole(roleName: string): boolean {
    const normalized = roleName.toUpperCase().replace(/[_\s-]/g, '');
    return normalized === 'SUPERADMIN';
  }
}
