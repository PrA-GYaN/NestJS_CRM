import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { ScopeService, ModuleScopeMap } from '../../common/permissions/scope.service';
import { StaffService } from '../staff/staff.service';
import { StaffStatusEnum } from '../staff/dto/staff.dto';
import { QueueStateMachine } from './queue-state-machine';
import {
  CreateQueueDto,
  UpdateQueueDto,
  QueueQueryDto,
  AddToQueueDto,
  QueueItemQueryDto,
  AssignQueueItemDto,
  ReassignQueueItemDto,
  UpdateQueueItemStatusDto,
  AssignmentHistoryQueryDto,
  QueueTypeEnum,
  QueueItemStatusEnum,
  AssignmentReasonEnum,
} from './dto/queue.dto';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private tenantService: TenantService,
    private staffService: StaffService,
    private scopeService: ScopeService,
  ) {}

  // ==================== Queue Management ====================

  async createQueue(tenantId: string, dto: CreateQueueDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    return tenantPrisma.queue.create({
      data: {
        tenantId,
        type: dto.type as any,
        name: dto.name,
        description: dto.description,
        autoAssign: dto.autoAssign ?? false,
      },
    });
  }

  async getAllQueues(tenantId: string, queryDto: QueueQueryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, type } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (type) where.type = type;

    const [queues, total] = await Promise.all([
      tenantPrisma.queue.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      tenantPrisma.queue.count({ where }),
    ]);

    const queuesWithCounts = await Promise.all(
      queues.map(async (queue) => {
        const [waiting, assigned, inProgress, completed] = await Promise.all([
          tenantPrisma.queueItem.count({ where: { queueId: queue.id, status: 'Waiting' as any } }),
          tenantPrisma.queueItem.count({ where: { queueId: queue.id, status: 'Assigned' as any } }),
          tenantPrisma.queueItem.count({
            where: { queueId: queue.id, status: 'InProgress' as any },
          }),
          tenantPrisma.queueItem.count({
            where: { queueId: queue.id, status: 'Completed' as any },
          }),
        ]);
        return { ...queue, counts: { waiting, assigned, inProgress, completed } };
      }),
    );

    return { data: queuesWithCounts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getQueueById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const queue = await tenantPrisma.queue.findFirst({ where: { id, tenantId } });
    if (!queue) throw new NotFoundException('Queue not found');

    const [waiting, assigned, inProgress, completed, skipped] = await Promise.all([
      tenantPrisma.queueItem.count({ where: { queueId: id, status: 'Waiting' as any } }),
      tenantPrisma.queueItem.count({ where: { queueId: id, status: 'Assigned' as any } }),
      tenantPrisma.queueItem.count({ where: { queueId: id, status: 'InProgress' as any } }),
      tenantPrisma.queueItem.count({ where: { queueId: id, status: 'Completed' as any } }),
      tenantPrisma.queueItem.count({ where: { queueId: id, status: 'Skipped' as any } }),
    ]);

    return { ...queue, counts: { waiting, assigned, inProgress, completed, skipped } };
  }

  async updateQueue(tenantId: string, id: string, dto: UpdateQueueDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getQueueById(tenantId, id);

    return tenantPrisma.queue.update({ where: { id }, data: dto as any });
  }

  async deleteQueue(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getQueueById(tenantId, id);

    await tenantPrisma.queueItem.deleteMany({ where: { queueId: id } });
    await tenantPrisma.queue.delete({ where: { id } });

    return { success: true, message: 'Queue deleted successfully' };
  }

  // ==================== Queue Items ====================

  async addToQueue(tenantId: string, queueId: string, dto: AddToQueueDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const queue = await tenantPrisma.queue.findFirst({ where: { id: queueId, tenantId } });
    if (!queue) throw new NotFoundException('Queue not found');

    const lead = await tenantPrisma.lead.findFirst({ where: { id: dto.leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const queueItem = await tenantPrisma.$transaction(async (tx: any) => {
      const existing = await tx.queueItem.findFirst({
        where: {
          tenantId,
          leadId: dto.leadId,
          status: { in: ['Waiting', 'Assigned', 'InProgress'] as any },
        },
      });
      if (existing) throw new BadRequestException('Lead is already in a queue');

      return tx.queueItem.create({
        data: {
          tenantId,
          queueId,
          leadId: dto.leadId,
          priority: lead.priority as any,
          notes: dto.notes,
          status: 'Waiting',
        },
        include: {
          lead: true,
          queue: { select: { id: true, type: true, name: true, autoAssign: true } },
        },
      });
    });

    if (queue.autoAssign) {
      try {
        return await this.autoAssignQueueItem(tenantId, queueItem.id);
      } catch (error: any) {
        this.logger.warn(`Auto-assignment failed for lead ${dto.leadId}: ${error.message}`);
        return queueItem;
      }
    }

    return queueItem;
  }

  async getQueueItems(tenantId: string, queueId: string, queryDto: QueueItemQueryDto, userScopes?: ModuleScopeMap, currentUserId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const {
      page = 1,
      limit = 10,
      sortBy = 'enteredAt',
      sortOrder = 'desc',
      status,
      assignedTo,
      leadId,
      search,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, queueId };

    const scope = userScopes?.['queues'] || userScopes?.__all__;
    if (scope === 'own' && currentUserId) {
      const staffProfile = await tenantPrisma.staffProfile.findFirst({
        where: { userId: currentUserId, tenantId },
      });
      if (staffProfile) {
        where.assignedTo = staffProfile.id;
      } else {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
    }

    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;
    if (leadId) where.leadId = leadId;

    if (search) {
      where.lead = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as any } },
          { lastName: { contains: search, mode: 'insensitive' as any } },
          { email: { contains: search, mode: 'insensitive' as any } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      tenantPrisma.queueItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          lead: { include: { assignedUser: { select: { id: true, name: true, email: true } } } },
          assignedStaff: { include: { user: { select: { id: true, name: true, email: true } } } },
          queue: { select: { id: true, type: true, name: true } },
        },
      }),
      tenantPrisma.queueItem.count({ where }),
    ]);

    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getQueueItemById(tenantId: string, itemId: string, userScopes?: ModuleScopeMap, currentUserId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const where: any = { id: itemId, tenantId };

    const scope = userScopes?.['queues'] || userScopes?.__all__;
    if (scope === 'own' && currentUserId) {
      const staffProfile = await tenantPrisma.staffProfile.findFirst({
        where: { userId: currentUserId, tenantId },
      });
      if (staffProfile) {
        where.assignedTo = staffProfile.id;
      } else {
        throw new NotFoundException('Queue item not found');
      }
    }

    const item = await tenantPrisma.queueItem.findFirst({
      where,
      include: {
        lead: { include: { assignedUser: { select: { id: true, name: true, email: true } } } },
        assignedStaff: { include: { user: { select: { id: true, name: true, email: true } } } },
        queue: { select: { id: true, type: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException('Queue item not found');
    return item;
  }

  async updateQueueItemStatus(tenantId: string, itemId: string, dto: UpdateQueueItemStatusDto, currentUserId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const item = await this.getQueueItemById(tenantId, itemId);

    QueueStateMachine.validateTransition(
      item.status as QueueItemStatusEnum,
      dto.status,
    );

    const updateData: any = {
      status: dto.status as any,
      notes: dto.notes !== undefined ? dto.notes : item.notes,
    };

    if (dto.status === QueueItemStatusEnum.Completed) {
      updateData.completedAt = new Date();
    }
    if (dto.status === QueueItemStatusEnum.Assigned && !item.assignedAt) {
      updateData.assignedAt = new Date();
    }

    const updatedItem = await tenantPrisma.queueItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        lead: true,
        assignedStaff: { include: { user: { select: { id: true, name: true, email: true } } } },
        queue: true,
      },
    });

    // Auto-manage staff status based on queue item transitions
    const staffProfileId = item.assignedTo || updatedItem.assignedTo;
    if (staffProfileId && currentUserId) {
      if (dto.status === QueueItemStatusEnum.InProgress) {
        await tenantPrisma.staffProfile.update({
          where: { id: staffProfileId },
          data: { status: StaffStatusEnum.Busy as any },
        });
      } else if (dto.status === QueueItemStatusEnum.Completed) {
        // Check if staff has any other InProgress items before setting Available
        const otherInProgress = await tenantPrisma.queueItem.count({
          where: {
            tenantId,
            assignedTo: staffProfileId,
            status: QueueItemStatusEnum.InProgress as any,
            id: { not: itemId },
          },
        });
        if (otherInProgress === 0) {
          await tenantPrisma.staffProfile.update({
            where: { id: staffProfileId },
            data: { status: StaffStatusEnum.Available as any },
          });
        }
      }
    }

    return updatedItem;
  }

  async removeFromQueue(tenantId: string, itemId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getQueueItemById(tenantId, itemId);

    await tenantPrisma.queueItem.delete({ where: { id: itemId } });
    return { success: true, message: 'Queue item removed successfully' };
  }

  // ==================== Smart Assignment Engine ====================

  async assignQueueItem(tenantId: string, itemId: string, dto: AssignQueueItemDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const item = await this.getQueueItemById(tenantId, itemId);

    QueueStateMachine.validateTransition(
      item.status as QueueItemStatusEnum,
      QueueItemStatusEnum.Assigned,
    );

    const staffProfile = await tenantPrisma.staffProfile.findFirst({
      where: { id: dto.staffProfileId, tenantId },
    });
    if (!staffProfile) throw new NotFoundException('Staff profile not found');

    const [updatedItem] = await tenantPrisma.$transaction(async (tx: any) => {
      const previousAssignment = item.assignedTo;

      const updated = await tx.queueItem.update({
        where: { id: itemId },
        data: {
          assignedTo: dto.staffProfileId,
          status: QueueItemStatusEnum.Assigned,
          assignedAt: new Date(),
          notes: dto.note || item.notes,
        },
        include: {
          lead: true,
          assignedStaff: { include: { user: { select: { id: true, name: true, email: true } } } },
          queue: true,
        },
      });

      await tx.lead.update({
        where: { id: item.leadId },
        data: {
          assignedUserId: staffProfile.userId,
          assignedViaQueue: true,
        },
      });

      await tx.assignmentHistory.create({
        data: {
          tenantId,
          leadId: item.leadId,
          fromStaffId: previousAssignment || undefined,
          toStaffId: dto.staffProfileId,
          reason: AssignmentReasonEnum.ManualAssignment as any,
          assignedBy: dto.note || null,
          metadata: { queueItemId: itemId, queueType: item.queue.type },
        },
      });

      return [updated];
    });

    return updatedItem;
  }

  async autoAssignQueueItem(tenantId: string, itemId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const item = await this.getQueueItemById(tenantId, itemId);

    QueueStateMachine.validateTransition(
      item.status as QueueItemStatusEnum,
      QueueItemStatusEnum.Assigned,
    );

    const lead = await tenantPrisma.lead.findFirst({ where: { id: item.leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');

    let preferredStaffId: string | undefined;

    if (item.queue.type === QueueTypeEnum.RevisitLead) {
      const lastAssignment = await tenantPrisma.assignmentHistory.findFirst({
        where: { tenantId, leadId: item.leadId },
        orderBy: { createdAt: 'desc' },
      });

      if (lastAssignment) {
        const previousStaff = await tenantPrisma.staffProfile.findFirst({
          where: { id: lastAssignment.toStaffId, tenantId },
          include: { user: true },
        });

        if (previousStaff && previousStaff.status === 'Available') {
          preferredStaffId = previousStaff.id;
        }
      }
    }

    const bestCounselor = await this.staffService.getBestCounselorForAssignment(
      tenantId,
      preferredStaffId,
    );

    if (!bestCounselor) {
      throw new BadRequestException('No available counselors for assignment');
    }

    const [updatedItem] = await tenantPrisma.$transaction(async (tx: any) => {
      const previousAssignment = item.assignedTo;

      const updated = await tx.queueItem.update({
        where: { id: itemId },
        data: {
          assignedTo: bestCounselor.staffId,
          status: QueueItemStatusEnum.Assigned,
          assignedAt: new Date(),
        },
        include: {
          lead: true,
          assignedStaff: { include: { user: { select: { id: true, name: true, email: true } } } },
          queue: true,
        },
      });

      await tx.lead.update({
        where: { id: item.leadId },
        data: {
          assignedUserId: bestCounselor.userId,
          assignedViaQueue: true,
        },
      });

      const reason =
        item.queue.type === QueueTypeEnum.RevisitLead
          ? AssignmentReasonEnum.RevisitAssignment
          : AssignmentReasonEnum.AutomaticAssignment;

      await tx.assignmentHistory.create({
        data: {
          tenantId,
          leadId: item.leadId,
          fromStaffId: previousAssignment || undefined,
          toStaffId: bestCounselor.staffId,
          reason: reason as any,
          metadata: {
            queueItemId: itemId,
            queueType: item.queue.type,
            preferredStaffId,
            assignedVia: 'auto',
          },
        },
      });

      return [updated];
    });

    return updatedItem;
  }

  async reassignQueueItem(tenantId: string, itemId: string, dto: ReassignQueueItemDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const item = await this.getQueueItemById(tenantId, itemId);

    const newStaff = await tenantPrisma.staffProfile.findFirst({
      where: { id: dto.toStaffProfileId, tenantId },
    });
    if (!newStaff) throw new NotFoundException('New staff profile not found');

    const workload = await this.staffService.getWorkload(tenantId, newStaff.id);
    const staffWorkload = workload[0];
    if (!staffWorkload) {
      throw new BadRequestException('Could not calculate workload for target staff');
    }

    if (staffWorkload.workloadPercentage >= 80) {
      throw new BadRequestException(
        `Target staff ${staffWorkload.name} has exceeded capacity (${staffWorkload.workloadPercentage}%). ` +
        `Reassignment rejected.`,
      );
    }

    if (newStaff.status === 'OnLeave' || newStaff.status === 'Offline') {
      throw new BadRequestException(
        `Target staff is currently ${newStaff.status} and cannot receive assignments.`,
      );
    }

    const [updatedItem] = await tenantPrisma.$transaction(async (tx: any) => {
      const previousAssignment = item.assignedTo;

      const updated = await tx.queueItem.update({
        where: { id: itemId },
        data: {
          assignedTo: dto.toStaffProfileId,
          status: QueueItemStatusEnum.Reassigned,
          notes: dto.reason || item.notes,
        },
        include: {
          lead: true,
          assignedStaff: { include: { user: { select: { id: true, name: true, email: true } } } },
          queue: true,
        },
      });

      const newQueueItem = await tx.queueItem.create({
        data: {
          tenantId,
          queueId: item.queueId,
          leadId: item.leadId,
          assignedTo: dto.toStaffProfileId,
          status: QueueItemStatusEnum.Assigned,
          assignedAt: new Date(),
          priority: item.priority,
          metadata: { reassignedFrom: itemId, reason: dto.reason },
        },
      });

      await tx.lead.update({
        where: { id: item.leadId },
        data: { assignedUserId: newStaff.userId },
      });

      const lastHistory = await tx.assignmentHistory.findFirst({
        where: { tenantId, leadId: item.leadId },
        orderBy: { createdAt: 'desc' },
      });

      await tx.assignmentHistory.create({
        data: {
          tenantId,
          leadId: item.leadId,
          fromStaffId: previousAssignment || undefined,
          toStaffId: dto.toStaffProfileId,
          reason: AssignmentReasonEnum.Reassignment as any,
          previousReason: lastHistory?.reason || undefined,
          reassignmentNote: dto.reason,
          metadata: {
            originalQueueItemId: itemId,
            newQueueItemId: newQueueItem.id,
          },
        },
      });

      return [updated, newQueueItem];
    });

    return {
      previousItem: updatedItem[0],
      newItem: updatedItem[1],
    };
  }

  async processNewLead(tenantId: string, queueId: string, leadId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const queue = await tenantPrisma.queue.findFirst({ where: { id: queueId, tenantId } });
    if (!queue) throw new NotFoundException('Queue not found');

    const queueItem = await this.addToQueue(tenantId, queueId, { leadId });

    // If autoAssign is enabled, addToQueue already handled assignment
    if (queue.autoAssign) {
      return queueItem;
    }

    try {
      return await this.autoAssignQueueItem(tenantId, queueItem.id);
    } catch (error: any) {
      this.logger.warn(`Auto-assignment failed for lead ${leadId}: ${error.message}`);
      return queueItem;
    }
  }

  // ==================== Assignment History ====================

  async getAssignmentHistory(tenantId: string, queryDto: AssignmentHistoryQueryDto, userScopes?: ModuleScopeMap, currentUserId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      leadId,
      staffId,
      reason,
      search,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    const scope = userScopes?.['queues'] || userScopes?.__all__;
    if (scope === 'own' && currentUserId) {
      const staffProfile = await tenantPrisma.staffProfile.findFirst({
        where: { userId: currentUserId, tenantId },
      });
      if (staffProfile) {
        where.OR = [{ toStaffId: staffProfile.id }, { fromStaffId: staffProfile.id }];
      } else {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
    }

    if (leadId) where.leadId = leadId;
    if (staffId) {
      if (where.OR) {
        where.AND = { OR: [{ toStaffId: staffId }, { fromStaffId: staffId }] };
      } else {
        where.OR = [{ toStaffId: staffId }, { fromStaffId: staffId }];
      }
    }
    if (reason) where.reason = reason;

    if (search) {
      where.lead = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as any } },
          { lastName: { contains: search, mode: 'insensitive' as any } },
          { email: { contains: search, mode: 'insensitive' as any } },
        ],
      };
    }

    const [history, total] = await Promise.all([
      tenantPrisma.assignmentHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, email: true } },
          fromStaff: { include: { user: { select: { id: true, name: true, email: true } } } },
          toStaff: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      }),
      tenantPrisma.assignmentHistory.count({ where }),
    ]);

    return { data: history, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getLeadAssignmentHistory(tenantId: string, leadId: string, userScopes?: ModuleScopeMap, currentUserId?: string) {
    return this.getAssignmentHistory(tenantId, { leadId } as any, userScopes, currentUserId);
  }

  // ==================== Queue Analytics ====================

  async getQueueAnalytics(tenantId: string, queueId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const queue = await tenantPrisma.queue.findFirst({ where: { id: queueId, tenantId } });
    if (!queue) throw new NotFoundException('Queue not found');

    const [totalItems, byStatus, completedItems] = await Promise.all([
      tenantPrisma.queueItem.count({ where: { queueId } }),
      tenantPrisma.queueItem.groupBy({
        by: ['status'],
        where: { queueId },
        _count: true,
      }),
      tenantPrisma.queueItem.findMany({
        where: {
          queueId,
          status: 'Completed',
          completedAt: { not: null as any },
          enteredAt: { not: null as any },
        },
        select: { enteredAt: true, assignedAt: true, completedAt: true },
      }),
    ]);

    let avgWaitTimeHours = 0;
    let avgProcessingTimeHours = 0;

    if (completedItems.length > 0) {
      const waitTimes = completedItems
        .filter((i: any) => i.assignedAt)
        .map((i: any) => (i.assignedAt.getTime() - i.enteredAt.getTime()) / (1000 * 60 * 60));
      avgWaitTimeHours =
        waitTimes.length > 0
          ? Math.round(
              (waitTimes.reduce((a: number, b: number) => a + b, 0) / waitTimes.length) * 100,
            ) / 100
          : 0;

      const processTimes = completedItems
        .filter((i: any) => i.completedAt && i.assignedAt)
        .map((i: any) => (i.completedAt.getTime() - i.assignedAt.getTime()) / (1000 * 60 * 60));
      avgProcessingTimeHours =
        processTimes.length > 0
          ? Math.round(
              (processTimes.reduce((a: number, b: number) => a + b, 0) / processTimes.length) * 100,
            ) / 100
          : 0;
    }

    const counts: any = { waiting: 0, assigned: 0, inProgress: 0, completed: 0, skipped: 0 };
    byStatus.forEach((item: any) => {
      counts[item.status.toLowerCase()] = item._count;
    });

    return {
      queueId: queue.id,
      queueName: queue.name,
      queueType: queue.type,
      totalItems,
      ...counts,
      avgWaitTimeHours,
      avgProcessingTimeHours,
    };
  }

  async getOverallAnalytics(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const [queues, totalItems, byStatus, recentAssignments] = await Promise.all([
      tenantPrisma.queue.findMany({ where: { tenantId } }),
      tenantPrisma.queueItem.count({ where: { tenantId } }),
      tenantPrisma.queueItem.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      tenantPrisma.assignmentHistory.findMany({
        where: { tenantId },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, email: true } },
          fromStaff: { include: { user: { select: { name: true } } } },
          toStaff: { include: { user: { select: { name: true } } } },
        },
      }),
    ]);

    const counts: any = {
      waiting: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      skipped: 0,
      reassigned: 0,
    };
    byStatus.forEach((item: any) => {
      const key = item.status.toLowerCase();
      if (key in counts) counts[key] = item._count;
    });

    const queueAnalytics = await Promise.all(
      queues.map((q) => this.getQueueAnalytics(tenantId, q.id)),
    );

    return {
      totalItems,
      ...counts,
      queues: queueAnalytics,
      recentAssignments,
    };
  }

  // ==================== Revisit Lead Handling ====================

  async handleRevisitLead(tenantId: string, leadId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const lead = await tenantPrisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const revisitQueue = await tenantPrisma.queue.findFirst({
      where: { tenantId, type: QueueTypeEnum.RevisitLead as any },
    });
    if (!revisitQueue)
      throw new NotFoundException(
        'Revisit queue not found. Please create a RevisitLead queue first.',
      );

    const lastAssignment = await tenantPrisma.assignmentHistory.findFirst({
      where: { tenantId, leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        toStaff: {
          include: { user: true },
        },
      },
    });

    if (lastAssignment && lastAssignment.toStaff) {
      const previousStaff = lastAssignment.toStaff;
      const previousUser = previousStaff.user;

      const userActive = previousUser.status === 'Active';
      const staffAvailable = previousStaff.status === 'Available';

      if (userActive && staffAvailable) {
        const workload = await this.staffService.getWorkload(tenantId, previousStaff.id);
        if (workload.length > 0 && workload[0].workloadPercentage < 80) {
          return tenantPrisma.$transaction(async (tx: any) => {
            const existing = await tx.queueItem.findFirst({
              where: {
                tenantId,
                leadId,
                status: { in: ['Waiting', 'Assigned', 'InProgress'] as any },
              },
            });

            const queueItem = existing
              ? existing
              : await tx.queueItem.create({
                  data: {
                    tenantId,
                    queueId: revisitQueue.id,
                    leadId,
                    priority: lead.priority as any,
                    assignedTo: previousStaff.id,
                    status: 'Assigned' as any,
                    assignedAt: new Date(),
                    notes: 'Revisit lead - assigned to previous counselor',
                  },
                  include: {
                    lead: true,
                    assignedStaff: {
                      include: { user: { select: { id: true, name: true, email: true } } },
                    },
                    queue: { select: { id: true, type: true, name: true } },
                  },
                });

            if (!existing) {
              await tx.lead.update({
                where: { id: leadId },
                data: { assignedUserId: previousStaff.userId, assignedViaQueue: true },
              });

              await tx.assignmentHistory.create({
                data: {
                  tenantId,
                  leadId,
                  toStaffId: previousStaff.id,
                  reason: AssignmentReasonEnum.RevisitAssignment as any,
                  metadata: {
                    queueItemId: queueItem.id,
                    queueType: revisitQueue.type,
                    assignedVia: 'revisit-previous-counselor',
                  },
                },
              });
            }

            return queueItem;
          });
        }
      }
    }

    const queueItem = await this.addToQueue(tenantId, revisitQueue.id, {
      leadId,
      notes: lastAssignment
        ? `Revisit lead - previous counselor unavailable, reassigning`
        : 'Revisit lead - no previous assignment found',
    });

    // If autoAssign is enabled, addToQueue already handled assignment
    if (revisitQueue.autoAssign) {
      return queueItem;
    }

    try {
      return await this.autoAssignQueueItem(tenantId, queueItem.id);
    } catch (error: any) {
      this.logger.warn(`Auto-assignment failed for revisit lead ${leadId}: ${error.message}`);
      return queueItem;
    }
  }
}
