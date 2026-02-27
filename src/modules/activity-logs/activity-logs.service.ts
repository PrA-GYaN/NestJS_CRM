import { Injectable } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';
import { CreateActivityLogDto, ActivityLogFilterDto } from './dto/activity-log.dto';

@Injectable()
export class ActivityLogsService {
  constructor(private tenantService: TenantService) {}

  /**
   * Create a single activity log entry
   */
  async createLog(tenantId: string, logDto: CreateActivityLogDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    return tenantPrisma.activityLog.create({
      data: {
        tenantId,
        userId: logDto.userId,
        entityType: logDto.entityType,
        entityId: logDto.entityId,
        action: logDto.action,
        changes: logDto.changes || {},
        metadata: logDto.metadata || {},
      },
      include: {
        user: logDto.userId
          ? {
              select: {
                id: true,
                name: true,
                email: true,
              },
            }
          : false,
      },
    });
  }

  /**
   * Create multiple activity logs in a batch (for performance)
   */
  async createBatchLogs(tenantId: string, logs: CreateActivityLogDto[]) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const data = logs.map((log) => ({
      tenantId,
      userId: log.userId,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      changes: log.changes || {},
      metadata: log.metadata || {},
    }));

    const result = await tenantPrisma.activityLog.createMany({
      data,
      skipDuplicates: true,
    });

    return { created: result.count };
  }

  /**
   * Get activity logs with filtering and pagination
   */
  async getLogs(
    tenantId: string,
    filterDto: ActivityLogFilterDto,
    paginationDto: PaginationDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'timestamp', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId };

    if (filterDto.userId) {
      where.userId = filterDto.userId;
    }

    if (filterDto.entityType) {
      where.entityType = filterDto.entityType;
    }

    if (filterDto.entityId) {
      where.entityId = filterDto.entityId;
    }

    if (filterDto.action) {
      where.action = filterDto.action;
    }

    if (filterDto.fromDate || filterDto.toDate) {
      where.timestamp = {};
      if (filterDto.fromDate) {
        where.timestamp.gte = new Date(filterDto.fromDate);
      }
      if (filterDto.toDate) {
        where.timestamp.lte = new Date(filterDto.toDate);
      }
    }

    const [logs, total] = await Promise.all([
      tenantPrisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      tenantPrisma.activityLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get activity logs for a specific entity
   */
  async getEntityLogs(
    tenantId: string,
    entityType: string,
    entityId: string,
    paginationDto: PaginationDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'timestamp', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      tenantPrisma.activityLog.findMany({
        where: { tenantId, entityType, entityId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      tenantPrisma.activityLog.count({ where: { tenantId, entityType, entityId } }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get activity logs for a specific user
   */
  async getUserLogs(tenantId: string, userId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'timestamp', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      tenantPrisma.activityLog.findMany({
        where: { tenantId, userId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      tenantPrisma.activityLog.count({ where: { tenantId, userId } }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const [
      totalLogs,
      logsByAction,
      logsByEntityType,
      recentActivity,
    ] = await Promise.all([
      tenantPrisma.activityLog.count({ where: { tenantId } }),
      tenantPrisma.activityLog.groupBy({
        by: ['action'],
        where: { tenantId },
        _count: true,
      }),
      tenantPrisma.activityLog.groupBy({
        by: ['entityType'],
        where: { tenantId },
        _count: true,
      }),
      tenantPrisma.activityLog.findMany({
        where: { tenantId },
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      totalLogs,
      byAction: logsByAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      byEntityType: logsByEntityType.map((item) => ({
        entityType: item.entityType,
        count: item._count,
      })),
      recentActivity,
    };
  }
}
