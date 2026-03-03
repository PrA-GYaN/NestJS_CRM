import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MasterPrismaService } from '../prisma/master-prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly masterPrisma: MasterPrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const host = req.get('host');

    let tenantId: string | null = null;

    // Resolve tenant from subdomain
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && !['localhost', 'www'].includes(subdomain)) {
        tenantId = subdomain;
      }
    }

    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }

    // Validate tenant exists
    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { subdomain: tenantId },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant');
    }

    // Attach tenant to request
    (req as any).tenantId = tenant.id;
    (req as any).tenant = tenant;

    next();
  }
}
