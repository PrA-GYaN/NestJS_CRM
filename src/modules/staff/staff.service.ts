import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { ScopeService, ModuleScopeMap } from '../../common/permissions/scope.service';
import { StaffTypeMapping } from './staff-type-mapping';
import {
  UpdateStaffProfileDto,
  StaffQueryDto,
  StaffTypeEnum,
  StaffStatusEnum,
} from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private tenantService: TenantService,
    private scopeService: ScopeService,
  ) {}

  async createProfileFromUser(
    tenantId: string,
    userId: string,
    staffType: StaffTypeEnum,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const existing = await tenantPrisma.staffProfile.findFirst({
      where: { tenantId, userId },
    });
    if (existing) {
      return existing;
    }

    return tenantPrisma.staffProfile.create({
      data: {
        tenantId,
        userId,
        staffType: staffType as any,
        status: StaffStatusEnum.Available as any,
        maxWorkload: 100,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, roleId: true },
        },
      },
    });
  }

  async getAllProfiles(tenantId: string, queryDto: StaffQueryDto, userScopes?: ModuleScopeMap, currentUserId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      staffType,
      status,
      userId,
      search,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    const ownershipFilter = this.scopeService.getOwnershipFilter(
      'staff',
      currentUserId,
      userScopes?.['staff'] || userScopes?.__all__,
    );
    if (ownershipFilter) Object.assign(where, ownershipFilter);

    if (staffType) where.staffType = staffType;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { email: { contains: search, mode: 'insensitive' as any } },
        ],
      };
    }

    const [profiles, total] = await Promise.all([
      tenantPrisma.staffProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy === 'name' ? 'createdAt' : sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, name: true, email: true, roleId: true, status: true },
          },
        },
      }),
      tenantPrisma.staffProfile.count({ where }),
    ]);

    return {
      data: profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProfileById(tenantId: string, id: string, userScopes?: ModuleScopeMap, currentUserId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const where: any = { id, tenantId };

    const ownershipFilter = this.scopeService.getOwnershipFilter(
      'staff',
      currentUserId,
      userScopes?.['staff'] || userScopes?.__all__,
    );
    if (ownershipFilter) Object.assign(where, ownershipFilter);

    const profile = await tenantPrisma.staffProfile.findFirst({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, roleId: true, status: true },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }
    return profile;
  }

  async getProfileByUserId(tenantId: string, userId: string, userScopes?: ModuleScopeMap, currentUserId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    if (userScopes) {
      const scope = userScopes['staff'] || userScopes.__all__ || 'full';
      if (scope === 'own' && currentUserId && userId !== currentUserId) {
        throw new NotFoundException('Staff profile not found for this user');
      }
    }

    const profile = await tenantPrisma.staffProfile.findFirst({
      where: { tenantId, userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, roleId: true, status: true },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException('Staff profile not found for this user');
    }
    return profile;
  }

  async updateProfile(tenantId: string, id: string, dto: UpdateStaffProfileDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const existing = await this.getProfileById(tenantId, id);

    if (dto.staffType) {
      const user = await tenantPrisma.user.findFirst({
        where: { id: existing.userId, tenantId },
        include: { role: true },
      });
      if (!user || !user.role) {
        throw new BadRequestException('User or role not found for validation');
      }
      StaffTypeMapping.validateStaffTypeRole(dto.staffType, user.role.name);
    }

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.staffType) data.staffType = dto.staffType;
    if (dto.maxWorkload !== undefined) data.maxWorkload = dto.maxWorkload;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.joinedAt) data.joinedAt = new Date(dto.joinedAt);

    return tenantPrisma.staffProfile.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true, roleId: true, status: true },
        },
      },
    });
  }

  async updateStatus(tenantId: string, id: string, status: StaffStatusEnum) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getProfileById(tenantId, id);

    return tenantPrisma.staffProfile.update({
      where: { id },
      data: { status: status as any },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async deleteProfile(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getProfileById(tenantId, id);

    await tenantPrisma.staffProfile.delete({ where: { id } });
    return { success: true, message: 'Staff profile deleted successfully' };
  }

  async getWorkload(tenantId: string, staffId?: string, userScopes?: ModuleScopeMap, currentUserId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const where: any = { tenantId };

    const ownershipFilter = this.scopeService.getOwnershipFilter(
      'staff',
      currentUserId,
      userScopes?.['staff'] || userScopes?.__all__,
    );
    if (ownershipFilter) Object.assign(where, ownershipFilter);

    if (staffId) where.id = staffId;

    const profiles = await tenantPrisma.staffProfile.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const workloadData = await Promise.all(
      profiles.map(async (profile) => {
        const [activeLeads, openTasks, pendingFollowUps, todayCalls, todayMeetings, queueLoad] =
          await Promise.all([
            tenantPrisma.lead.count({
              where: {
                tenantId,
                assignedUserId: profile.userId,
                status: { notIn: ['Converted', 'NotInterested', 'NotReachable'] as any },
              },
            }),
            tenantPrisma.task.count({
              where: {
                tenantId,
                assignedTo: profile.userId,
                status: { notIn: ['Completed', 'Cancelled'] as any },
              },
            }),
            tenantPrisma.task.count({
              where: {
                tenantId,
                assignedTo: profile.userId,
                relatedEntityType: 'Lead',
                status: 'Pending' as any,
              },
            }),
            tenantPrisma.activityLog.count({
              where: {
                tenantId,
                userId: profile.userId,
                entityType: 'Lead',
                action: 'Call' as any,
                timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
              },
            }),
            tenantPrisma.appointment.count({
              where: {
                tenantId,
                staffId: profile.userId,
                scheduledAt: { gte: new Date() },
                status: { in: ['Scheduled', 'Booked'] as any },
              },
            }),
            tenantPrisma.queueItem.count({
              where: {
                tenantId,
                assignedTo: profile.id,
                status: { in: ['Waiting', 'Assigned', 'InProgress'] as any },
              },
            }),
          ]);

        const currentWorkload = activeLeads + openTasks + queueLoad;
        const workloadPercentage =
          profile.maxWorkload > 0 ? Math.round((currentWorkload / profile.maxWorkload) * 100) : 0;

        return {
          staffId: profile.id,
          userId: profile.userId,
          name: profile.user.name,
          email: profile.user.email,
          staffType: profile.staffType,
          status: profile.status,
          activeLeads,
          openTasks,
          pendingFollowUps,
          todayCalls,
          todayMeetings,
          queueLoad,
          currentWorkload,
          maxWorkload: profile.maxWorkload,
          workloadPercentage,
        };
      }),
    );

    return workloadData;
  }

  async getCounselorDashboard(tenantId: string, staffId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const profile = await this.getProfileById(tenantId, staffId);

    const workload = await this.getWorkload(tenantId, staffId);
    const myWorkload = workload[0];

    const [assignedLeads, tasks, followUps, upcomingAppointments, recentActivities] =
      await Promise.all([
        tenantPrisma.lead.findMany({
          where: { tenantId, assignedUserId: profile.userId },
          take: 20,
          orderBy: { updatedAt: 'desc' },
          include: { assignedUser: { select: { id: true, name: true, email: true } } },
        }),
        tenantPrisma.task.findMany({
          where: { tenantId, assignedTo: profile.userId },
          take: 20,
          orderBy: { dueDate: 'asc' },
          include: { assignedUser: { select: { id: true, name: true, email: true } } },
        }),
        tenantPrisma.task.findMany({
          where: {
            tenantId,
            assignedTo: profile.userId,
            relatedEntityType: 'Lead',
            status: 'Pending' as any,
          },
          take: 10,
          orderBy: { dueDate: 'asc' },
        }),
        tenantPrisma.appointment.findMany({
          where: { tenantId, staffId: profile.userId, scheduledAt: { gte: new Date() } },
          take: 10,
          orderBy: { scheduledAt: 'asc' },
          include: { student: { select: { firstName: true, lastName: true, email: true } } },
        }),
        tenantPrisma.activityLog.findMany({
          where: { tenantId, userId: profile.userId },
          take: 20,
          orderBy: { timestamp: 'desc' },
        }),
      ]);

    return {
      profile,
      workload: myWorkload,
      assignedLeads,
      tasks,
      followUps,
      upcomingAppointments,
      recentActivities,
    };
  }

  async getAvailableCounselors(tenantId: string) {
    const workloadData = await this.getWorkload(tenantId);
    return workloadData.filter(
      (w) =>
        w.staffType === StaffTypeEnum.Counselor &&
        w.status === StaffStatusEnum.Available &&
        w.workloadPercentage < 80,
    );
  }

  async getBestCounselorForAssignment(tenantId: string, preferredStaffId?: string) {
    const workloadData = await this.getWorkload(tenantId);

    const available = workloadData.filter(
      (w) =>
        w.staffType === StaffTypeEnum.Counselor &&
        w.status === StaffStatusEnum.Available &&
        w.workloadPercentage < 80,
    );

    if (available.length === 0) {
      return null;
    }

    if (preferredStaffId) {
      const preferred = available.find((w) => w.staffId === preferredStaffId);
      if (preferred) return preferred;
    }

    available.sort((a, b) => a.workloadPercentage - b.workloadPercentage);
    return available[0];
  }

  async getStaffStats(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const [totalStaff, byType, byStatus, workloadData] = await Promise.all([
      tenantPrisma.staffProfile.count({ where: { tenantId } }),
      tenantPrisma.staffProfile.groupBy({
        by: ['staffType'],
        where: { tenantId },
        _count: true,
      }),
      tenantPrisma.staffProfile.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      this.getWorkload(tenantId),
    ]);

    const avgWorkload =
      workloadData.length > 0
        ? Math.round(
            workloadData.reduce((sum, w) => sum + w.workloadPercentage, 0) / workloadData.length,
          )
        : 0;

    return {
      totalStaff,
      byType: byType.map((i: any) => ({ type: i.staffType, count: i._count })),
      byStatus: byStatus.map((i: any) => ({ status: i.status, count: i._count })),
      avgWorkload,
      overloaded: workloadData.filter((w) => w.workloadPercentage >= 80).length,
      available: workloadData.filter(
        (w) => w.workloadPercentage < 80 && w.status === StaffStatusEnum.Available,
      ).length,
    };
  }
}
