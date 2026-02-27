import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';
import { CreateNotificationDto, NotificationStatus } from './dto/notification.dto';
import { Subject } from 'rxjs';

interface NotificationEvent {
  tenantId: string;
  userId: string;
  data: any;
}

@Injectable()
export class NotificationsService {
  private notificationSubject = new Subject<NotificationEvent>();

  constructor(private tenantService: TenantService) {}

  /**
   * Get the notification stream observable for SSE
   */
  getNotificationStream() {
    return this.notificationSubject.asObservable();
  }

  /**
   * Create and send a notification to a user
   */
  async createNotification(
    tenantId: string,
    createNotificationDto: CreateNotificationDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const notification = await tenantPrisma.notification.create({
      data: {
        tenantId,
        userId: createNotificationDto.userId,
        type: createNotificationDto.type,
        message: createNotificationDto.message,
        status: NotificationStatus.Sent,
        metadata: createNotificationDto.metadata || {},
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Emit notification to SSE stream
    this.notificationSubject.next({
      tenantId,
      userId: createNotificationDto.userId,
      data: notification,
    });

    return notification;
  }

  /**
   * Get all notifications for a user with pagination
   */
  async getUserNotifications(
    tenantId: string,
    userId: string,
    paginationDto: PaginationDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      tenantPrisma.notification.findMany({
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
      tenantPrisma.notification.count({ where: { tenantId, userId } }),
    ]);

    return {
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread notifications count for a user
   */
  async getUnreadCount(tenantId: string, userId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const count = await tenantPrisma.notification.count({
      where: {
        tenantId,
        userId,
        status: { in: [NotificationStatus.Sent, NotificationStatus.Unread] },
      },
    });

    return { count };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(tenantId: string, notificationId: string, userId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const notification = await tenantPrisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return tenantPrisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.Read,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(tenantId: string, userId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const result = await tenantPrisma.notification.updateMany({
      where: {
        tenantId,
        userId,
        status: { in: [NotificationStatus.Sent, NotificationStatus.Unread] },
      },
      data: {
        status: NotificationStatus.Read,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(tenantId: string, notificationId: string, userId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const notification = await tenantPrisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await tenantPrisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true, message: 'Notification deleted successfully' };
  }
}
