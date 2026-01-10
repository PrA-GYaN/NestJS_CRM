import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionsDto,
} from './dto/users.dto';
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
    await this.getUserById(tenantId, id);

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

    const existingRole = await tenantPrisma.role.findFirst({
      where: { tenantId, name: createRoleDto.name },
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
      roleId,
      permissionId,
    }));

    await tenantPrisma.rolePermission.createMany({
      data: rolePermissions,
    });

    return { success: true, message: 'Permissions assigned successfully' };
  }
}
