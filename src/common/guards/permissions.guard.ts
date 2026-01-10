import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
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
      return false;
    }

    // Get tenant-specific Prisma client
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

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
      return false;
    }

    const userPermissions = userWithRole.role.rolePermissions.map(
      (rp: any) => rp.permission.name,
    );

    return requiredPermissions.every((permission) => userPermissions.includes(permission));
  }
}
