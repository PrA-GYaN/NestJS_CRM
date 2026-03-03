import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.tenantId;

    if (!user || !tenantId) {
      this.logger.warn('Permission check failed: Missing user or tenantId');
      throw new ForbiddenException('Authentication required');
    }

    // Get tenant-specific Prisma client
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // --- Student path ---
    // Students authenticate against the Student model, not the User model.
    // Look up the student record and grant permissions for the defined student-allowed set.
    if (user.isStudent) {
      const student = await tenantPrisma.student.findFirst({
        where: { id: user.id, tenantId, isActive: true },
      });

      if (!student) {
        this.logger.warn(`Permission check failed: Active student not found - ${user.id}`);
        throw new ForbiddenException('Student not found or inactive');
      }

      // Permissions that students are allowed to exercise on their own behalf
      const STUDENT_ALLOWED_PERMISSIONS = [
        'documents:upload',
        'documents:read',
        'documents:download',
      ];

      const hasPermission = requiredPermissions.every((p) =>
        STUDENT_ALLOWED_PERMISSIONS.includes(p),
      );

      if (!hasPermission) {
        this.logger.warn(
          `Student permission denied for ${user.id}: Required [${requiredPermissions.join(', ')}]`,
        );
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        );
      }

      this.logger.debug(`Student permission granted for user: ${user.id}`);
      return true;
    }

    // --- Regular user path ---
    // Fetch user's role and permissions
    const userWithRole = await tenantPrisma.user.findUnique({
      where: { id: user.id },
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

    if (!userWithRole) {
      this.logger.warn(`Permission check failed: User not found - ${user.id}`);
      throw new ForbiddenException('User not found');
    }

    // Check if user's role has admin override
    if (userWithRole.role.isAdmin) {
      this.logger.debug(`Admin override granted for user: ${user.id}`);
      return true;
    }

    const userPermissions = userWithRole.role.rolePermissions.map(
      (rp: any) => rp.permission.name,
    );

    const hasPermission = requiredPermissions.every((permission) => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      // Log permission failure
      this.logger.warn(
        `Permission denied for user ${user.id} (${user.email}): ` +
        `Required [${requiredPermissions.join(', ')}], ` +
        `Has [${userPermissions.join(', ')}]`
      );

      // Log to audit trail
      try {
        await tenantPrisma.activityLog.create({
          data: {
            tenantId,
            userId: user.id,
            entityType: 'Permission',
            entityId: requiredPermissions.join(','),
            action: 'AccessDenied',
            metadata: {
              endpoint: request.url,
              method: request.method,
              requiredPermissions,
              userPermissions,
              userRole: userWithRole.role.name,
            },
          },
        });
      } catch (auditError) {
        this.logger.error('Failed to log permission denial:', auditError);
      }

      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
