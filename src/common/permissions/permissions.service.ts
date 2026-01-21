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
  private readonly MODULE_DEFINITIONS: ModulePermissions[] = [
    {
      module: 'leads',
      actions: ['create', 'read', 'update', 'delete', 'export', 'assign'],
      description: 'Lead management permissions',
    },
    {
      module: 'students',
      actions: ['create', 'read', 'update', 'delete', 'export', 'manage-documents'],
      description: 'Student management permissions',
    },
    {
      module: 'users',
      actions: ['create', 'read', 'update', 'delete', 'manage-roles'],
      description: 'User management permissions',
    },
    {
      module: 'universities',
      actions: ['create', 'read', 'update', 'delete', 'export'],
      description: 'University management permissions',
    },
    {
      module: 'courses',
      actions: ['create', 'read', 'update', 'delete', 'export'],
      description: 'Course management permissions',
    },
    {
      module: 'applications',
      actions: ['create', 'read', 'update', 'delete', 'submit', 'approve', 'reject'],
      description: 'Application management permissions',
    },
    {
      module: 'tasks',
      actions: ['create', 'read', 'update', 'delete', 'assign', 'complete'],
      description: 'Task management permissions',
    },
    {
      module: 'appointments',
      actions: ['create', 'read', 'update', 'delete', 'schedule', 'cancel'],
      description: 'Appointment management permissions',
    },
    {
      module: 'documents',
      actions: ['create', 'read', 'update', 'delete', 'upload', 'download'],
      description: 'Document management permissions',
    },
    {
      module: 'payments',
      actions: ['create', 'read', 'update', 'delete', 'process', 'refund'],
      description: 'Payment management permissions',
    },
    {
      module: 'reports',
      actions: ['read', 'export', 'create'],
      description: 'Reporting permissions',
    },
    {
      module: 'dashboard',
      actions: ['read'],
      description: 'Dashboard access permissions',
    },
    {
      module: 'settings',
      actions: ['read', 'update'],
      description: 'Settings management permissions',
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
   * Create default roles with permissions for a new tenant
   */
  async seedDefaultRoles(
    tenantPrisma: TenantPrismaClient,
    tenantId: string,
  ): Promise<void> {
    this.logger.log(`Creating default roles for tenant: ${tenantId}`);

    // Fetch all permissions
    const allPermissions = await tenantPrisma.permission.findMany({
      where: { tenantId },
    });

    // Define default roles
    const defaultRoles = [
      {
        name: 'Super Admin',
        description: 'Full access to all modules and operations',
        isAdmin: true,
        permissions: allPermissions.map((p) => p.id), // All permissions
      },
      {
        name: 'Admin',
        description: 'Administrative access to most modules',
        isAdmin: false,
        permissions: allPermissions
          .filter((p) => !['users:delete', 'settings:update'].includes(p.name))
          .map((p) => p.id),
      },
      {
        name: 'Counselor',
        description: 'Access to student and application management',
        isAdmin: false,
        permissions: allPermissions
          .filter((p) =>
            [
              'leads',
              'students',
              'applications',
              'tasks',
              'appointments',
              'documents',
              'universities',
              'courses',
              'dashboard',
              'messaging',
            ].includes(p.module),
          )
          .map((p) => p.id),
      },
      {
        name: 'Sales',
        description: 'Access to lead management and basic operations',
        isAdmin: false,
        permissions: allPermissions
          .filter((p) =>
            ['leads', 'tasks', 'appointments', 'dashboard', 'messaging'].includes(
              p.module,
            ) && !['delete'].includes(p.action),
          )
          .map((p) => p.id),
      },
      {
        name: 'Viewer',
        description: 'Read-only access to most modules',
        isAdmin: false,
        permissions: allPermissions
          .filter((p) => p.action === 'read')
          .map((p) => p.id),
      },
    ];

    // Create roles
    for (const roleDef of defaultRoles) {
      const role = await tenantPrisma.role.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: roleDef.name,
          },
        },
        create: {
          tenantId,
          name: roleDef.name,
          description: roleDef.description,
          isAdmin: roleDef.isAdmin,
        },
        update: {
          description: roleDef.description,
          isAdmin: roleDef.isAdmin,
        },
      });

      // Delete existing role permissions
      await tenantPrisma.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      // Create role permissions
      const rolePermissions = roleDef.permissions.map((permissionId) => ({
        tenantId,
        roleId: role.id,
        permissionId,
      }));

      if (rolePermissions.length > 0) {
        await tenantPrisma.rolePermission.createMany({
          data: rolePermissions,
          skipDuplicates: true,
        });
      }

      this.logger.log(
        `✅ Role "${roleDef.name}" created with ${roleDef.permissions.length} permissions`,
      );
    }
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
