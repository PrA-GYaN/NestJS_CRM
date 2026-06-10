import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '@prisma/tenant-client';

export interface ModuleScopeMap {
  [module: string]: string;
}

const SCOPE_HIERARCHY: Record<string, number> = {
  own: 1,
  full: 2,
};

/**
 * Maps each module to the Prisma where-field that represents
 * "ownership" — i.e. the field that should be matched against the
 * current user's ID when the scope is "own".
 *
 * Modules not listed here default to "full" only (no "own" filter).
 */
const OWNERSHIP_FIELD_MAP: Record<string, string> = {
  leads: 'assignedUserId',
  students: 'assignedCounselorId',
  tasks: 'assignedTo',
  appointments: 'staffId',
  'course-applications': 'assignedTo',
  'activity-logs': 'userId',
  notifications: 'userId',
  staff: 'userId',
  queues: 'assignedTo',
};

@Injectable()
export class ScopeService {
  private readonly logger = new Logger(ScopeService.name);

  getScopeHierarchy(): Record<string, number> {
    return SCOPE_HIERARCHY;
  }

  /**
   * Returns a Prisma `where` clause that restricts results to records
   * owned by the given user. Returns `null` when the scope is `full`
   * or the module has no ownership mapping, meaning no filter is needed.
   *
   * @example
   * // For leads with 'own' scope:
   * getOwnershipFilter('leads', 'user-123')
   * // → { assignedUserId: 'user-123' }
   *
   * // For universities with 'own' scope (no ownership mapping):
   * getOwnershipFilter('universities', 'user-123')
   * // → null  (universities are reference data, always full-access)
   */
  getOwnershipFilter(
    module: string,
    userId?: string,
    scope?: string,
  ): Record<string, string> | null {
    if (scope === 'full' || !userId) {
      return null;
    }

    const field = OWNERSHIP_FIELD_MAP[module];
    if (!field) {
      return null;
    }

    return { [field]: userId };
  }

  async getUserScopes(
    tenantPrisma: TenantPrismaClient,
    userId: string,
  ): Promise<ModuleScopeMap> {
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
      return {};
    }

    if (user.role.isAdmin) {
      return { __all__: 'full' };
    }

    const scopeMap: ModuleScopeMap = {};
    for (const rp of user.role.rolePermissions) {
      const module = rp.permission.module;
      const rpScope = (rp as any).scope || 'full';
      const newLevel = SCOPE_HIERARCHY[rpScope] || 0;
      const existingLevel = scopeMap[module] ? (SCOPE_HIERARCHY[scopeMap[module]] || 0) : 0;

      if (!scopeMap[module] || newLevel > existingLevel) {
        scopeMap[module] = rpScope;
      }
    }

    return scopeMap;
  }

  async getUserScopeForModule(
    tenantPrisma: TenantPrismaClient,
    userId: string,
    module: string,
  ): Promise<string> {
    const scopes = await this.getUserScopes(tenantPrisma, userId);
    return scopes[module] || scopes['__all__'] || 'own';
  }
}
