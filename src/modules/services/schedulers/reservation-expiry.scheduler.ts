import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TenantService } from '../../../common/tenant/tenant.service';
import { MasterPrismaService } from '../../../common/prisma/master-prisma.service';
import { PrismaClient as TenantPrismaClient } from '@prisma/tenant-client';

/**
 * Scheduler for automatically expiring pending booking requests (tests and classes)
 * when their reservation time has exceeded.
 */
@Injectable()
export class ReservationExpiryScheduler {
  private readonly logger = new Logger(ReservationExpiryScheduler.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Cron job to expire pending reservations
   * Default: Every minute ('* * * * *')
   * Can be configured via environment variable: CRON_RESERVATION_EXPIRY
   */
  @Cron(`${process.env.CRON_RESERVATION_EXPIRY || '* * * * *'}`, {
    timeZone: 'UTC',
  })
  async handleReservationExpiry() {
    try {
      this.logger.log('Starting reservation expiry job...');

      // Get all tenant IDs
      const tenantIds = await this.getAllTenantIds();

      if (tenantIds.length === 0) {
        this.logger.debug('No tenants found to process');
        return;
      }

      // Process all tenants in parallel
      const results = await Promise.all(
        tenantIds.map((tenantId) => this.processExpirationsForTenant(tenantId)),
      );

      // Aggregate and log results
      let totalExpiredTests = 0;
      let totalExpiredClasses = 0;

      for (const result of results) {
        if (result) {
          totalExpiredTests += result.expiredTestCount;
          totalExpiredClasses += result.expiredClassCount;
        }
      }

      this.logger.log(
        `Reservation expiry job completed. ` +
          `Expired tests: ${totalExpiredTests}, ` +
          `Expired classes: ${totalExpiredClasses}`,
      );
    } catch (error) {
      this.logger.error(
        `Error during reservation expiry job: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Process expiration for a specific tenant
   */
  private async processExpirationsForTenant(
    tenantId: string,
  ): Promise<{ expiredTestCount: number; expiredClassCount: number } | null> {
    try {
      const prisma = await this.tenantService.getTenantPrisma(tenantId);

      const [expiredTestCount, expiredClassCount] = await Promise.all([
        this.expireTestReservations(prisma, tenantId),
        this.expireClassReservations(prisma, tenantId),
      ]);

      if (expiredTestCount > 0 || expiredClassCount > 0) {
        this.logger.debug(
          `Tenant ${tenantId}: Expired ${expiredTestCount} test requests, ${expiredClassCount} class requests`,
        );
      }

      return { expiredTestCount, expiredClassCount };
    } catch (error) {
      this.logger.error(
        `Error processing expiration for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Expire pending test booking requests that have exceeded their reservation time
   */
  private async expireTestReservations(
    prisma: TenantPrismaClient,
    tenantId: string,
  ): Promise<number> {
    try {
      const result = await prisma.testBookingRequest.updateMany({
        where: {
          tenantId,
          status: 'Pending',
          reservationExpiresAt: {
            lte: new Date(),
          },
        },
        data: {
          status: 'Expired',
        },
      });

      return result.count;
    } catch (error) {
      this.logger.error(
        `Error expiring test reservations for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }

  /**
   * Expire pending class booking requests that have exceeded their reservation time
   */
  private async expireClassReservations(
    prisma: TenantPrismaClient,
    tenantId: string,
  ): Promise<number> {
    try {
      const result = await prisma.classBookingRequest.updateMany({
        where: {
          tenantId,
          status: 'Pending',
          reservationExpiresAt: {
            lte: new Date(),
          },
        },
        data: {
          status: 'Expired',
        },
      });

      return result.count;
    } catch (error) {
      this.logger.error(
        `Error expiring class reservations for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }

  /**
   * Get all tenant IDs from master database
   * This ensures we process all active tenants
   */
  private async getAllTenantIds(): Promise<string[]> {
    try {
      const tenants = await this.masterPrisma.tenant.findMany({
        where: { status: 'Active' },
        select: { id: true },
      });

      return tenants.map((tenant) => tenant.id);
    } catch (error) {
      this.logger.error(
        `Error fetching tenant IDs: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
