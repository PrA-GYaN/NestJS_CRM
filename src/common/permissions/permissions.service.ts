import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '@prisma/tenant-client';

export interface PermissionDefinition {
  name: string;
  module: string;
  action: string;
  description?: string;
}

export interface ModulePermissions {
  module: string;
  actions: string[];
  description?: string;
}

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  // Define all modules and their available actions
  // Only includes modules that exist in the system
  private readonly MODULE_DEFINITIONS: ModulePermissions[] = [
    {
      module: 'users',
      actions: ['create', 'read', 'update', 'delete'],
      description: 'User management permissions',
    },
    {
      module: 'roles',
      actions: ['create', 'read', 'update', 'delete'],
      description: 'Role management permissions',
    },
    {
      module: 'leads',
      actions: ['create', 'read', 'update', 'delete', 'export', 'assign', 'convert'],
      description: 'Lead management permissions',
    },
    {
      module: 'students',
      actions: ['create', 'read', 'update', 'delete', 'export'],
      description: 'Student management permissions',
    },
    {
      module: 'universities',
      actions: ['create', 'read', 'update', 'delete', 'export'],
      description: 'University management permissions',
    },
    {
      module: 'tasks',
      actions: ['create', 'read', 'update', 'delete', 'assign', 'complete'],
      description: 'Task management permissions',
    },
    {
      module: 'appointments',
      actions: ['create', 'read', 'update', 'delete', 'cancel'],
      description: 'Appointment management permissions',
    },
    {
      module: 'files',
      actions: ['create', 'read', 'update', 'delete', 'download'],
      description: 'File management permissions',
    },
    {
      module: 'dashboard',
      actions: ['read'],
      description: 'Dashboard access permissions',
    },
    {
      module: 'workflows',
      actions: ['create', 'read', 'update', 'delete', 'execute'],
      description: 'Workflow management permissions',
    },
    {
      module: 'messaging',
      actions: ['create', 'read', 'send', 'delete'],
      description: 'Messaging permissions',
    },
    {
      module: 'templates',
      actions: ['create', 'read', 'update', 'delete'],
      description: 'Template management permissions',
    },
    {
      module: 'services',
      actions: ['create', 'read', 'update', 'delete', 'assign'],
      description: 'Service management permissions',
    },
    {
      module: 'visa-types',
      actions: ['create', 'read', 'update', 'delete'],
      description: 'Visa type management permissions',
    },
    {
      module: 'countries',
      actions: ['create', 'read', 'update', 'delete'],
      description: 'Country management permissions',
    },
    {
      module: 'scholarships',
      actions: ['create', 'read', 'update', 'delete', 'export'],
      description: 'Scholarship management permissions',
    },
    {
      module: 'blogs',
      actions: ['create', 'read', 'update', 'delete', 'publish'],
      description: 'Blog management permissions',
    },
    {
      module: 'faqs',
      actions: ['create', 'read', 'update', 'delete'],
      description: 'FAQ management permissions',
    },
    {
      module: 'landing-pages',
      actions: ['create', 'read', 'update', 'delete', 'publish'],
      description: 'Landing page management permissions',
    },
  ];

  /**
   * Generate all permission definitions from module definitions
   */
  generatePermissionDefinitions(): PermissionDefinition[] {
    const permissions: PermissionDefinition[] = [];

    for (const moduleDef of this.MODULE_DEFINITIONS) {
      for (const action of moduleDef.actions) {
        permissions.push({
          name: `${moduleDef.module}:${action}`,
          module: moduleDef.module,
          action: action,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${moduleDef.module}`,
        });
      }
    }

    return permissions;
  }

  /**
   * Seed permissions for a tenant (idempotent)
   */
  async seedPermissions(
    tenantPrisma: TenantPrismaClient,
    tenantId: string,
  ): Promise<{ created: number; existing: number }> {
    this.logger.log(`Seeding permissions for tenant: ${tenantId}`);

    const permissionDefs = this.generatePermissionDefinitions();
    let created = 0;
    let existing = 0;

    for (const permDef of permissionDefs) {
      try {
        await tenantPrisma.permission.upsert({
          where: {
            tenantId_name: {
              tenantId,
              name: permDef.name,
            },
          },
          create: {
            tenantId,
            name: permDef.name,
            module: permDef.module,
            action: permDef.action,
            description: permDef.description,
          },
          update: {
            module: permDef.module,
            action: permDef.action,
            description: permDef.description,
          },
        });
        created++;
      } catch (error) {
        // Permission already exists
        existing++;
      }
    }

    this.logger.log(
      `✅ Permissions seeded for tenant ${tenantId}: ${created} created/updated, ${existing} skipped`,
    );

    return { created, existing };
  }

  /**
   * Create SUPER_ADMIN role with all permissions for a new tenant
   * This is only called during tenant provisioning - SUPER_ADMIN cannot be created manually
   */
  async createSuperAdminRole(
    tenantPrisma: TenantPrismaClient,
    tenantId: string,
  ): Promise<any> {
    this.logger.log(`Creating SUPER_ADMIN role for tenant: ${tenantId}`);

    // Fetch all permissions
    const allPermissions = await tenantPrisma.permission.findMany({
      where: { tenantId },
    });

    // Create SUPER_ADMIN role
    const superAdminRole = await tenantPrisma.role.create({
      data: {
        tenantId,
        name: 'SUPER_ADMIN',
        description: 'Immutable super administrator with full system access',
        isAdmin: true,
      },
    });

    // Assign all permissions to SUPER_ADMIN
    const rolePermissions = allPermissions.map((permission) => ({
      tenantId,
      roleId: superAdminRole.id,
      permissionId: permission.id,
    }));

    if (rolePermissions.length > 0) {
      await tenantPrisma.rolePermission.createMany({
        data: rolePermissions,
        skipDuplicates: true,
      });
    }

    this.logger.log(
      `✅ SUPER_ADMIN role created with ${allPermissions.length} permissions`,
    );

    return superAdminRole;
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    tenantPrisma: TenantPrismaClient,
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    const user = await tenantPrisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return false;
    }

    // Check if user's role has admin override
    if (user.role.isAdmin) {
      return true;
    }

    // Check if user has the specific permission
    const userPermissions = user.role.rolePermissions.map(
      (rp) => rp.permission.name,
    );

    return userPermissions.includes(permissionName);
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(
    tenantPrisma: TenantPrismaClient,
    userId: string,
  ): Promise<string[]> {
    const user = await tenantPrisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    // If admin, return all permissions
    if (user.role.isAdmin) {
      const allPermissions = await tenantPrisma.permission.findMany({
        select: { name: true },
      });
      return allPermissions.map((p) => p.name);
    }

    return user.role.rolePermissions.map((rp) => rp.permission.name);
  }

  /**
   * Get module definitions (useful for UI generation)
   */
  getModuleDefinitions(): ModulePermissions[] {
    return this.MODULE_DEFINITIONS;
  }
}
