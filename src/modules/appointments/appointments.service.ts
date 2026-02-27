import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService} from '../activity-logs/activity-logs.service';
import { NotificationEntityType } from '../notifications/dto/notification.dto';
import { ActivityAction } from '../activity-logs/dto/activity-log.dto';
import { WorkingHoursService } from '../working-hours/working-hours.service';
import {
  CreateAppointmentRequestDto,
  AppointmentsQueryDto,
  CancelAppointmentDto,
  ApproveAppointmentDto,
  RejectAppointmentDto,
  CompleteAppointmentDto,
  CheckAvailabilityDto,
  AppointmentStatusEnum,
  AppointmentRequestedByEnum,
} from './dto/appointment.dto';
import { DayOfWeekEnum } from '../working-hours/dto/working-hours.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private tenantService: TenantService,
    private notificationsService: NotificationsService,
    private activityLogsService: ActivityLogsService,
    private workingHoursService: WorkingHoursService,
  ) {}

  /**
   * Convert date to day of week enum
   */
  private getDayOfWeek(date: Date): DayOfWeekEnum {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[date.getDay()] as DayOfWeekEnum;
  }

  /**
   * Get time in HH:MM format from date
   */
  private getTimeOfDay(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Convert UTC date to tenant timezone
   */
  private convertToTenantTimezone(utcDate: Date, timezone: string): Date {
    // Note: In production, use a library like date-fns-tz or moment-timezone
    // This is a simplified implementation
    const utcString = utcDate.toISOString();
    const localDate = new Date(
      new Date(utcString).toLocaleString('en-US', { timeZone: timezone }),
    );
    return localDate;
  }

  /**
   * Add minutes to a date
   */
  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  /**
   * Check if appointment time is within working hours
   */
  private async validateWorkingHours(
    tenantId: string,
    scheduledAt: Date,
    duration: number,
    timezone: string,
  ): Promise<void> {
    // Convert to tenant timezone
    const localDate = this.convertToTenantTimezone(scheduledAt, timezone);
    const dayOfWeek = this.getDayOfWeek(localDate);
    const timeOfDay = this.getTimeOfDay(localDate);

    // Check working hours
    const { isWithin, workingHours } =
      await this.workingHoursService.isWithinWorkingHours(
        tenantId,
        dayOfWeek,
        timeOfDay,
      );

    if (!isWithin || !workingHours?.isOpen) {
      throw new BadRequestException(
        `Requested time is outside office hours. Office hours for ${dayOfWeek}: ${workingHours?.openTime || 'Closed'} - ${workingHours?.closeTime || 'Closed'}`,
      );
    }

    // Check if appointment ends within working hours
    const endTime = this.addMinutes(localDate, duration);
    const endTimeOfDay = this.getTimeOfDay(endTime);

    if (endTimeOfDay > workingHours.closeTime) {
      throw new BadRequestException(
        `Appointment extends beyond closing time. Office closes at ${workingHours.closeTime}`,
      );
    }
  }

  /**
   * Check for conflicts with booked appointments
   */
  private async checkConflicts(
    tenantId: string,
    staffId: string,
    scheduledAt: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const whereConflict: any = {
      tenantId,
      staffId,
      status: AppointmentStatusEnum.Booked,
      OR: [
        {
          // Existing appointment starts during new appointment
          scheduledAt: {
            gte: scheduledAt,
            lt: endTime,
          },
        },
        {
          // Existing appointment ends during new appointment
          endTime: {
            gt: scheduledAt,
            lte: endTime,
          },
        },
        {
          // New appointment is completely within existing appointment
          AND: [
            { scheduledAt: { lte: scheduledAt } },
            { endTime: { gte: endTime } },
          ],
        },
      ],
    };

    if (excludeAppointmentId) {
      whereConflict.id = { not: excludeAppointmentId };
    }

    return tenantPrisma.appointment.findMany({
      where: whereConflict,
      select: {
        id: true,
        scheduledAt: true,
        endTime: true,
        status: true,
      },
    });
  }

  /**
   * Student creates an appointment request
   */
  async createAppointmentRequest(
    tenantId: string,
    studentId: string,
    createDto: CreateAppointmentRequestDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Validate duration
    if (createDto.duration < 15 || createDto.duration > 120) {
      throw new BadRequestException(
        'Appointment duration must be between 15 and 120 minutes',
      );
    }

    // Validate duration is in 15-minute increments
    if (createDto.duration % 15 !== 0) {
      throw new BadRequestException(
        'Appointment duration must be in 15-minute increments',
      );
    }

    const scheduledAt = new Date(createDto.scheduledAt);
    const endTime = this.addMinutes(scheduledAt, createDto.duration);

    // Validate appointment is in the future (at least 1 hour from now)
    const now = new Date();
    const oneHourFromNow = this.addMinutes(now, 60);

    if (scheduledAt < oneHourFromNow) {
      throw new BadRequestException(
        'Appointments must be scheduled at least 1 hour in advance',
      );
    }

    // Determine staff assignment
    let assignedStaffId = createDto.staffId;
    if (!assignedStaffId) {
      // Auto-assign staff (placeholder logic - assign to first available staff)
      const staff = await tenantPrisma.user.findFirst({
        where: {
          tenantId,
          status: 'Active',
          role: {
            name: { in: ['Admin', 'Staff', 'Counselor'] },
          },
        },
      });

      if (!staff) {
        throw new NotFoundException('No staff members available');
      }

      assignedStaffId = staff.id;
    } else {
      // Verify staff exists and belongs to tenant
      const staff = await tenantPrisma.user.findFirst({
        where: {
          id: assignedStaffId,
          tenantId,
          status: 'Active',
        },
      });

      if (!staff) {
        throw new NotFoundException('Staff member not found');
      }
    }

    // Validate working hours
    await this.validateWorkingHours(
      tenantId,
      scheduledAt,
      createDto.duration,
      createDto.timezone,
    );

    // Check for conflicts with booked appointments (pending don't block)
    const conflicts = await this.checkConflicts(
      tenantId,
      assignedStaffId,
      scheduledAt,
      endTime,
    );

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Staff already has a booked appointment during this time',
        conflictingAppointment: conflicts[0],
      });
    }

    // Create appointment with Pending status
    const appointment = await tenantPrisma.appointment.create({
      data: {
        tenantId,
        studentId,
        staffId: assignedStaffId,
        scheduledAt,
        duration: createDto.duration,
        endTime,
        timezone: createDto.timezone,
        purpose: createDto.purpose,
        notes: createDto.notes,
        status: AppointmentStatusEnum.Pending,
        requestedBy: AppointmentRequestedByEnum.Student,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        staff: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send notification to staff
    const studentName = `${appointment.student?.firstName} ${appointment.student?.lastName}`;
    await this.notificationsService.createNotification(tenantId, {
      userId: assignedStaffId,
      type: NotificationEntityType.Appointment,
      message: `New appointment request from ${studentName} for ${new Date(appointment.scheduledAt).toLocaleString()}`,
      metadata: {
        appointmentId: appointment.id,
        studentId,
        scheduledAt,
      },
    });

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId: studentId,
      entityType: 'Appointment',
      entityId: appointment.id,
      action: ActivityAction.Created,
      metadata: {
        status: AppointmentStatusEnum.Pending,
        scheduledAt,
      },
    });

    return appointment;
  }

  /**
   * Get appointments with filtering
   */
  async findAll(tenantId: string, queryDto: AppointmentsQueryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const {
      page = 1,
      limit = 10,
      sortBy = 'scheduledAt',
      sortOrder = 'desc',
      status,
      from,
      to,
      date,
      staffId,
      studentId,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    if (staffId) {
      where.staffId = staffId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    // Date filtering
    if (date) {
      // Filter by specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.scheduledAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else {
      // Date range filtering
      if (from || to) {
        where.scheduledAt = {};
        if (from) {
          where.scheduledAt.gte = new Date(from);
        }
        if (to) {
          where.scheduledAt.lte = new Date(to);
        }
      }
    }

    const [appointments, total] = await Promise.all([
      tenantPrisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          staff: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      tenantPrisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single appointment by ID
   */
  async findOne(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const appointment = await tenantPrisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        staff: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  // Legacy method for backward compatibility
  async createAppointment(tenantId: string, data: any, creatorId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const appointment = await tenantPrisma.appointment.create({
      data: {
        ...data,
        tenantId,
      },
      include: {
        student: true,
        staff: true,
      },
    });

    // Send notification to staff
    if (appointment.staffId) {
      const studentName = `${appointment.student.firstName} ${appointment.student.lastName}`;
      await this.notificationsService.createNotification(tenantId, {
        userId: appointment.staffId,
        type: NotificationEntityType.Appointment,
        message: `New appointment scheduled with ${studentName} for ${new Date(appointment.scheduledAt).toLocaleString()}`,
        metadata: {
          appointmentId: appointment.id,
          studentId: appointment.studentId,
        },
      });
    }

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId: creatorId,
      entityType: 'Appointment',
      entityId: appointment.id,
      action: ActivityAction.Created,
      metadata: {
        studentId: appointment.studentId,
        staffId: appointment.staffId,
        scheduledAt: appointment.scheduledAt,
      },
    });

    return appointment;
  }

  // Legacy method for backward compatibility
  async getAllAppointments(tenantId: string, paginationDto: any) {
    return this.findAll(tenantId, paginationDto);
  }

  // Legacy method for backward compatibility
  async getAppointmentById(tenantId: string, id: string) {
    return this.findOne(tenantId, id);
  }

  /**
   * Get student's appointments
   */
  async getStudentAppointments(
    tenantId: string,
    studentId: string,
    queryDto: AppointmentsQueryDto,
  ) {
    return this.findAll(tenantId, { ...queryDto, studentId });
  }

  /**
   * Get staff's appointments
   */
  async getStaffAppointments(
    tenantId: string,
    staffId: string,
    queryDto: AppointmentsQueryDto,
  ) {
    return this.findAll(tenantId, { ...queryDto, staffId });
  }

  /**
   * Get pending appointments (for staff approval queue)
   */
  async getPendingAppointments(
    tenantId: string,
    queryDto: AppointmentsQueryDto,
  ) {
    return this.findAll(tenantId, {
      ...queryDto,
      status: AppointmentStatusEnum.Pending,
    });
  }

  /**
   * Cancel appointment (student or staff)
   */
  async cancel(
    tenantId: string,
    appointmentId: string,
    cancelDto: CancelAppointmentDto,
    userId: string,
    userRole: 'student' | 'staff',
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const appointment = await this.findOne(tenantId, appointmentId);

    // Validate state transition
    if (
      ![
        AppointmentStatusEnum.Pending,
        AppointmentStatusEnum.Booked,
      ].includes(appointment.status as AppointmentStatusEnum)
    ) {
      throw new BadRequestException(
        `Cannot cancel appointment with status: ${appointment.status}`,
      );
    }

    // Verify ownership for students
    if (userRole === 'student' && appointment.studentId !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own appointments',
      );
    }

    // Update appointment
    const updated = await tenantPrisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatusEnum.Cancelled,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: cancelDto.cancellationReason,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        staff: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send notification to staff
    const studentName = `${updated.student.firstName} ${updated.student.lastName}`;
    await this.notificationsService.createNotification(tenantId, {
      userId: appointment.staffId,
      type: NotificationEntityType.Appointment,
      message: `Appointment with ${studentName} has been cancelled`,
      metadata: {
        appointmentId,
        cancelledBy: userRole,
        cancellationReason: cancelDto.cancellationReason,
      },
    });

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId,
      entityType: 'Appointment',
      entityId: appointmentId,
      action: ActivityAction.StatusChanged,
      metadata: {
        oldStatus: appointment.status,
        newStatus: AppointmentStatusEnum.Cancelled,
        cancellationReason: cancelDto.cancellationReason,
      },
    });

    return updated;
  }

  /**
   * Approve appointment (staff only) - with optimistic locking
   */
  async approve(
    tenantId: string,
    appointmentId: string,
    approveDto: ApproveAppointmentDto,
    staffUserId: string,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Retry logic for optimistic locking
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Get appointment with current version
        const appointment = await this.findOne(tenantId, appointmentId);

        // Validate status
        if (appointment.status !== AppointmentStatusEnum.Pending) {
          throw new BadRequestException(
            `Cannot approve appointment with status: ${appointment.status}`,
          );
        }

        // Re-check for conflicts (race condition protection)
        const conflicts = await this.checkConflicts(
          tenantId,
          appointment.staffId,
          appointment.scheduledAt,
          appointment.endTime,
          appointmentId,
        );

        if (conflicts.length > 0) {
          throw new ConflictException({
            error: 'APPROVAL_CONFLICT',
            message: 'Another appointment was approved during this time',
            conflictingAppointment: conflicts[0],
          });
        }

        // Attempt update with optimistic lock
        const result = await tenantPrisma.appointment.updateMany({
          where: {
            id: appointmentId,
            version: appointment.version,
            status: AppointmentStatusEnum.Pending,
            tenantId,
          },
          data: {
            status: AppointmentStatusEnum.Booked,
            approvedAt: new Date(),
            approvedBy: staffUserId,
            staffNotes: approveDto.staffNotes,
            version: { increment: 1 },
          },
        });

        // Check if update succeeded
        if (result.count === 0) {
          throw new ConflictException(
            'Appointment was modified by another process',
          );
        }

        // Fetch updated appointment
        const updated = await this.findOne(tenantId, appointmentId);

        // Send notification to staff
        const studentName = `${appointment.student.firstName} ${appointment.student.lastName}`;
        await this.notificationsService.createNotification(tenantId, {
          userId: appointment.staffId,
          type: NotificationEntityType.Appointment,
          message: `Appointment with ${studentName} has been approved`,
          metadata: {
            appointmentId,
            scheduledAt: appointment.scheduledAt,
          },
        });

        // Log activity
        await this.activityLogsService.createLog(tenantId, {
          userId: staffUserId,
          entityType: 'Appointment',
          entityId: appointmentId,
          action: ActivityAction.StatusChanged,
          metadata: {
            oldStatus: AppointmentStatusEnum.Pending,
            newStatus: AppointmentStatusEnum.Booked,
          },
        });

        return updated;
      } catch (error) {
        if (
          error instanceof ConflictException &&
          attempt < maxRetries - 1
        ) {
          attempt++;
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * Math.pow(2, attempt - 1)),
          );
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Reject appointment (staff only)
   */
  async reject(
    tenantId: string,
    appointmentId: string,
    rejectDto: RejectAppointmentDto,
    staffUserId: string,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const appointment = await this.findOne(tenantId, appointmentId);

    // Validate status
    if (appointment.status !== AppointmentStatusEnum.Pending) {
      throw new BadRequestException(
        `Cannot reject appointment with status: ${appointment.status}`,
      );
    }

    // Update appointment
    const updated = await tenantPrisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatusEnum.Rejected,
        rejectedAt: new Date(),
        rejectedBy: staffUserId,
        rejectionReason: rejectDto.rejectionReason,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        staff: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send notification to staff
    const studentName = `${updated.student.firstName} ${updated.student.lastName}`;
    await this.notificationsService.createNotification(tenantId, {
      userId: appointment.staffId,
      type: NotificationEntityType.Appointment,
      message: `Appointment with ${studentName} has been rejected`,
      metadata: {
        appointmentId,
        rejectionReason: rejectDto.rejectionReason,
      },
    });

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId: staffUserId,
      entityType: 'Appointment',
      entityId: appointmentId,
      action: ActivityAction.StatusChanged,
      metadata: {
        oldStatus: AppointmentStatusEnum.Pending,
        newStatus: AppointmentStatusEnum.Rejected,
        rejectionReason: rejectDto.rejectionReason,
      },
    });

    return updated;
  }

  /**
   * Mark appointment as completed (staff only)
   */
  async complete(
    tenantId: string,
    appointmentId: string,
    completeDto: CompleteAppointmentDto,
    staffUserId: string,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const appointment = await this.findOne(tenantId, appointmentId);

    // Validate status
    if (appointment.status !== AppointmentStatusEnum.Booked) {
      throw new BadRequestException(
        `Cannot complete appointment with status: ${appointment.status}`,
      );
    }

    // Validate appointment is in the past or current
    const now = new Date();
    if (appointment.scheduledAt > now) {
      throw new BadRequestException('Cannot complete future appointments');
    }

    // Verify staff is assigned to appointment
    if (appointment.staffId !== staffUserId) {
      throw new ForbiddenException(
        'You can only complete your own appointments',
      );
    }

    // Update appointment
    const updated = await tenantPrisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatusEnum.Completed,
        completedAt: new Date(),
        outcomeNotes: completeDto.outcomeNotes,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        staff: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId: staffUserId,
      entityType: 'Appointment',
      entityId: appointmentId,
      action: ActivityAction.StatusChanged,
      metadata: {
        oldStatus: AppointmentStatusEnum.Booked,
        newStatus: AppointmentStatusEnum.Completed,
      },
    });

    return updated;
  }

  /**
   * Mark appointment as no-show (staff only)
   */
  async markNoShow(
    tenantId: string,
    appointmentId: string,
    staffUserId: string,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const appointment = await this.findOne(tenantId, appointmentId);

    // Validate status
    if (appointment.status !== AppointmentStatusEnum.Booked) {
      throw new BadRequestException(
        `Cannot mark as no-show appointment with status: ${appointment.status}`,
      );
    }

    // Validate appointment is in the past
    const now = new Date();
    if (appointment.scheduledAt > now) {
      throw new BadRequestException(
        'Cannot mark future appointments as no-show',
      );
    }

    // Verify staff is assigned to appointment
    if (appointment.staffId !== staffUserId) {
      throw new ForbiddenException(
        'You can only mark your own appointments as no-show',
      );
    }

    // Update appointment
    const updated = await tenantPrisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatusEnum.NoShow,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        staff: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId: staffUserId,
      entityType: 'Appointment',
      entityId: appointmentId,
      action: ActivityAction.StatusChanged,
      metadata: {
        oldStatus: AppointmentStatusEnum.Booked,
        newStatus: AppointmentStatusEnum.NoShow,
      },
    });

    return updated;
  }

  /**
   * Check availability for a time slot
   */
  async checkAvailability(tenantId: string, checkDto: CheckAvailabilityDto) {
    const scheduledAt = new Date(checkDto.scheduledAt);
    const endTime = this.addMinutes(scheduledAt, checkDto.duration);

    // Check working hours
    let withinWorkingHours = true;
    let workingHours: any = null;

    try {
      await this.validateWorkingHours(
        tenantId,
        scheduledAt,
        checkDto.duration,
        checkDto.timezone,
      );

      // Get working hours info
      const localDate = this.convertToTenantTimezone(
        scheduledAt,
        checkDto.timezone,
      );
      const dayOfWeek = this.getDayOfWeek(localDate);
      const result = await this.workingHoursService.findByDay(
        tenantId,
        dayOfWeek,
      );
      workingHours = {
        dayOfWeek,
        openTime: result.openTime,
        closeTime: result.closeTime,
      };
    } catch (error) {
      withinWorkingHours = false;
      return {
        available: false,
        scheduledAt,
        duration: checkDto.duration,
        endTime,
        withinWorkingHours,
        reason: 'OUTSIDE_WORKING_HOURS',
        workingHours: null,
      };
    }

    // Check for conflicts
    const conflicts = await this.checkConflicts(
      tenantId,
      checkDto.staffId,
      scheduledAt,
      endTime,
    );

    if (conflicts.length > 0) {
      return {
        available: false,
        scheduledAt,
        duration: checkDto.duration,
        endTime,
        withinWorkingHours,
        conflicts,
        reason: 'STAFF_CONFLICT',
      };
    }

    return {
      available: true,
      scheduledAt,
      duration: checkDto.duration,
      endTime,
      withinWorkingHours,
      conflicts: [],
    };
  }

  /**
   * Get staff dashboard stats
   */
  async getStaffDashboardStats(tenantId: string, staffId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const oneWeekFromNow = this.addMinutes(now, 7 * 24 * 60);

    const [
      pendingApprovals,
      todayAppointments,
      upcomingWeekAppointments,
      completedCount,
      noShowCount,
      nextAppointment,
      allCompletedAppointments,
    ] = await Promise.all([
      tenantPrisma.appointment.count({
        where: {
          tenantId,
          staffId,
          status: AppointmentStatusEnum.Pending,
        },
      }),
      tenantPrisma.appointment.count({
        where: {
          tenantId,
          staffId,
          status: AppointmentStatusEnum.Booked,
          scheduledAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      tenantPrisma.appointment.count({
        where: {
          tenantId,
          staffId,
          status: AppointmentStatusEnum.Booked,
          scheduledAt: {
            gte: now,
            lte: oneWeekFromNow,
          },
        },
      }),
      tenantPrisma.appointment.count({
        where: {
          tenantId,
          staffId,
          status: AppointmentStatusEnum.Completed,
        },
      }),
      tenantPrisma.appointment.count({
        where: {
          tenantId,
          staffId,
          status: AppointmentStatusEnum.NoShow,
        },
      }),
      tenantPrisma.appointment.findFirst({
        where: {
          tenantId,
          staffId,
          status: AppointmentStatusEnum.Booked,
          scheduledAt: { gte: now },
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      tenantPrisma.appointment.findMany({
        where: {
          tenantId,
          staffId,
          status: AppointmentStatusEnum.Completed,
        },
        select: {
          duration: true,
        },
      }),
    ]);

    // Calculate completion rate
    const totalCompleted = completedCount + noShowCount;
    const completionRate =
      totalCompleted > 0 ? completedCount / totalCompleted : 0;

    // Calculate average appointment duration
    const totalDuration = allCompletedAppointments.reduce(
      (sum, apt) => sum + apt.duration,
      0,
    );
    const averageAppointmentDuration =
      allCompletedAppointments.length > 0
        ? totalDuration / allCompletedAppointments.length
        : 0;

    return {
      pendingApprovals,
      todayAppointments,
      upcomingWeekAppointments,
      completionRate: Math.round(completionRate * 100) / 100,
      averageAppointmentDuration: Math.round(averageAppointmentDuration),
      nextAppointment,
    };
  }

  // Legacy method for backward compatibility

  // Legacy method for backward compatibility
  async updateAppointment(tenantId: string, id: string, data: any, updaterId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const oldAppointment = await this.getAppointmentById(tenantId, id);

    const updatedAppointment = await tenantPrisma.appointment.update({
      where: { id },
      data,
      include: {
        student: true,
        staff: true,
      },
    });

    // Build notification message based on what changed
    let notificationMessage = 'Your appointment has been updated';
    const changes: Record<string, any> = {};

    if (oldAppointment.scheduledAt !== updatedAppointment.scheduledAt) {
      notificationMessage = `Your appointment has been rescheduled to ${new Date(updatedAppointment.scheduledAt).toLocaleString()}`;
      changes.scheduledAt = {
        before: oldAppointment.scheduledAt,
        after: updatedAppointment.scheduledAt,
      };
    }

    if (oldAppointment.status !== updatedAppointment.status) {
      notificationMessage = `Appointment status changed to ${updatedAppointment.status}`;
      changes.status = {
        before: oldAppointment.status,
        after: updatedAppointment.status,
      };
    }

    if (oldAppointment.staffId !== updatedAppointment.staffId) {
      changes.staffId = {
        before: oldAppointment.staffId,
        after: updatedAppointment.staffId,
      };
    }

    // Send notification to staff
    if (updatedAppointment.staffId) {
      const studentName = `${updatedAppointment.student.firstName} ${updatedAppointment.student.lastName}`;
      await this.notificationsService.createNotification(tenantId, {
        userId: updatedAppointment.staffId,
        type: NotificationEntityType.Appointment,
        message: `Appointment with ${studentName} updated: ${notificationMessage}`,
        metadata: {
          appointmentId: updatedAppointment.id,
          studentId: updatedAppointment.studentId,
          scheduledAt: updatedAppointment.scheduledAt,
          changes,
        },
      });
    }

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId: updaterId,
      entityType: 'Appointment',
      entityId: updatedAppointment.id,
      action:
        oldAppointment.status !== updatedAppointment.status
          ? ActivityAction.StatusChanged
          : ActivityAction.Updated,
      changes,
      metadata: {
        scheduledAt: updatedAppointment.scheduledAt,
      },
    });

    return updatedAppointment;
  }

  // Legacy method for backward compatibility
  async deleteAppointment(tenantId: string, id: string, deleterId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const appointment = await this.getAppointmentById(tenantId, id);

    await tenantPrisma.appointment.delete({
      where: { id },
    });

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId: deleterId,
      entityType: 'Appointment',
      entityId: id,
      action: ActivityAction.Deleted,
      metadata: {
        studentId: appointment.studentId,
        staffId: appointment.staffId,
        scheduledAt: appointment.scheduledAt,
      },
    });

    return { success: true, message: 'Appointment deleted successfully' };
  }
}
