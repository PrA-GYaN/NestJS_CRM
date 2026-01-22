import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationEntityType } from '../notifications/dto/notification.dto';
import { ActivityAction } from '../activity-logs/dto/activity-log.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private tenantService: TenantService,
    private notificationsService: NotificationsService,
    private activityLogsService: ActivityLogsService,
  ) {}

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

    // Send notifications to staff and student
    const notificationPromises = [];

    if (appointment.staffId) {
      notificationPromises.push(
        this.notificationsService.createNotification(tenantId, {
          userId: appointment.staffId,
          type: NotificationEntityType.Appointment,
          message: `New appointment scheduled for ${new Date(appointment.scheduledAt).toLocaleString()}`,
          metadata: {
            appointmentId: appointment.id,
            studentId: appointment.studentId,
            scheduledAt: appointment.scheduledAt,
          },
        }),
      );
    }

    if (appointment.studentId) {
      notificationPromises.push(
        this.notificationsService.createNotification(tenantId, {
          userId: appointment.studentId,
          type: NotificationEntityType.Appointment,
          message: `Your appointment has been scheduled for ${new Date(appointment.scheduledAt).toLocaleString()}`,
          metadata: {
            appointmentId: appointment.id,
            staffId: appointment.staffId,
            scheduledAt: appointment.scheduledAt,
          },
        }),
      );
    }

    await Promise.all(notificationPromises);

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

  async getAllAppointments(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'scheduledAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      tenantPrisma.appointment.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: true,
          staff: true,
        },
      }),
      tenantPrisma.appointment.count({ where: { tenantId } }),
    ]);

    return {
      data: appointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAppointmentById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const appointment = await tenantPrisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        student: true,
        staff: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

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
      changes.status = { before: oldAppointment.status, after: updatedAppointment.status };
    }

    if (oldAppointment.staffId !== updatedAppointment.staffId) {
      changes.staffId = { before: oldAppointment.staffId, after: updatedAppointment.staffId };
    }

    // Send notifications to involved parties
    const notificationPromises = [];

    if (updatedAppointment.staffId) {
      notificationPromises.push(
        this.notificationsService.createNotification(tenantId, {
          userId: updatedAppointment.staffId,
          type: NotificationEntityType.Appointment,
          message: `Appointment updated: ${notificationMessage}`,
          metadata: {
            appointmentId: updatedAppointment.id,
            scheduledAt: updatedAppointment.scheduledAt,
            changes,
          },
        }),
      );
    }

    if (updatedAppointment.studentId) {
      notificationPromises.push(
        this.notificationsService.createNotification(tenantId, {
          userId: updatedAppointment.studentId,
          type: NotificationEntityType.Appointment,
          message: notificationMessage,
          metadata: {
            appointmentId: updatedAppointment.id,
            scheduledAt: updatedAppointment.scheduledAt,
            changes,
          },
        }),
      );
    }

    await Promise.all(notificationPromises);

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
