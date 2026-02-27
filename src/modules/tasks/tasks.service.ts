import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationEntityType } from '../notifications/dto/notification.dto';
import { ActivityAction } from '../activity-logs/dto/activity-log.dto';
import { TaskStatus } from '@prisma/tenant-client';

@Injectable()
export class TasksService {
  constructor(
    private tenantService: TenantService,
    private notificationsService: NotificationsService,
    private activityLogsService: ActivityLogsService,
  ) {}

  async createTask(tenantId: string, data: any, creatorId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const task = await tenantPrisma.task.create({
      data: {
        ...data,
        tenantId,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notification to assigned user if exists
    if (task.assignedTo) {
      await this.notificationsService.createNotification(tenantId, {
        userId: task.assignedTo,
        type: NotificationEntityType.Task,
        message: `You have been assigned a new task: ${task.title}`,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          priority: task.priority,
          dueDate: task.dueDate,
        },
      });
    }

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId: creatorId,
      entityType: 'Task',
      entityId: task.id,
      action: ActivityAction.Created,
      metadata: {
        taskTitle: task.title,
        assignedTo: task.assignedTo,
      },
    });

    return task;
  }

  async getAllTasks(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      tenantPrisma.task.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      tenantPrisma.task.count({ where: { tenantId } }),
    ]);

    return {
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTaskById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const task = await tenantPrisma.task.findFirst({
      where: { id, tenantId },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async updateTask(tenantId: string, id: string, data: any, updaterId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const oldTask = await this.getTaskById(tenantId, id);

    const updatedTask = await tenantPrisma.task.update({
      where: { id },
      data,
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Build notification message based on what changed
    let notificationMessage = `Task "${updatedTask.title}" has been updated`;
    const changes: Record<string, any> = {};

    if (oldTask.status !== updatedTask.status) {
      notificationMessage = `Task "${updatedTask.title}" status changed to ${updatedTask.status}`;
      changes.status = { before: oldTask.status, after: updatedTask.status };
    }

    if (oldTask.assignedTo !== updatedTask.assignedTo) {
      notificationMessage = `You have been assigned to task: ${updatedTask.title}`;
      changes.assignedTo = { before: oldTask.assignedTo, after: updatedTask.assignedTo };
    }

    if (oldTask.priority !== updatedTask.priority) {
      changes.priority = { before: oldTask.priority, after: updatedTask.priority };
    }

    if (oldTask.dueDate !== updatedTask.dueDate) {
      changes.dueDate = { before: oldTask.dueDate, after: updatedTask.dueDate };
    }

    // Send notification to assigned user if exists
    if (updatedTask.assignedTo) {
      await this.notificationsService.createNotification(tenantId, {
        userId: updatedTask.assignedTo,
        type: NotificationEntityType.Task,
        message: notificationMessage,
        metadata: {
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          priority: updatedTask.priority,
          status: updatedTask.status,
          changes,
        },
      });
    }

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId: updaterId,
      entityType: 'Task',
      entityId: updatedTask.id,
      action: oldTask.status !== updatedTask.status ? ActivityAction.StatusChanged : ActivityAction.Updated,
      changes,
      metadata: {
        taskTitle: updatedTask.title,
      },
    });

    return updatedTask;
  }

  async deleteTask(tenantId: string, id: string, deleterId?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const task = await this.getTaskById(tenantId, id);

    await tenantPrisma.task.delete({
      where: { id },
    });

    // Log activity
    await this.activityLogsService.createLog(tenantId, {
      userId: deleterId,
      entityType: 'Task',
      entityId: id,
      action: ActivityAction.Deleted,
      metadata: {
        taskTitle: task.title,
      },
    });

    return { success: true, message: 'Task deleted successfully' };
  }

  async getTasksByUser(tenantId: string, userId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      tenantPrisma.task.findMany({
        where: { tenantId, assignedTo: userId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      tenantPrisma.task.count({ where: { tenantId, assignedTo: userId } }),
    ]);

    return {
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get overdue tasks (dueDate < now && status NOT IN [Completed, Cancelled])
   */
  async findOverdueTasks(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'dueDate', sortOrder = 'asc' } = paginationDto;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where = {
      tenantId,
      dueDate: {
        lt: now,
      },
      status: {
        notIn: [TaskStatus.Completed, TaskStatus.Cancelled],
      },
    };

    const [tasks, total] = await Promise.all([
      tenantPrisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      tenantPrisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all SUPERADMIN users for a tenant
   */
  private async getSuperAdminUsers(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const users = await tenantPrisma.user.findMany({
      where: {
        tenantId,
        role: {
          name: {
            in: ['SUPER_ADMIN', 'SuperAdmin', 'Super Admin', 'super_admin'],
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return users;
  }

  /**
   * Notify superadmins about overdue tasks
   */
  async notifySuperAdminsAboutOverdueTasks(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const now = new Date();

    // Get overdue tasks
    const overdueTasks = await tenantPrisma.task.findMany({
      where: {
        tenantId,
        dueDate: {
          lt: now,
        },
        status: {
          notIn: ['Completed', 'Cancelled'],
        },
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (overdueTasks.length === 0) {
      return { message: 'No overdue tasks found', notificationsSent: 0 };
    }

    // Get SUPERADMIN users
    const superAdmins = await this.getSuperAdminUsers(tenantId);

    if (superAdmins.length === 0) {
      return { message: 'No SUPERADMIN users found', notificationsSent: 0 };
    }

    // Create notifications for each superadmin for each overdue task
    let notificationsSent = 0;
    for (const task of overdueTasks) {
      for (const admin of superAdmins) {
        // Check if notification already exists for this task + admin combination
        const existingNotification = await tenantPrisma.notification.findFirst({
          where: {
            tenantId,
            userId: admin.id,
            type: NotificationEntityType.Task,
            message: {
              contains: task.id,
            },
          },
        });

        // Only create notification if it doesn't exist
        if (!existingNotification) {
          await this.notificationsService.createNotification(tenantId, {
            userId: admin.id,
            type: NotificationEntityType.Task,
            message: `Overdue Task: "${task.title}" assigned to ${task.assignedUser?.name || 'Unassigned'}`,
            metadata: {
              taskId: task.id,
              taskTitle: task.title,
              assignedTo: task.assignedTo,
              assignedUserName: task.assignedUser?.name,
              dueDate: task.dueDate,
              priority: task.priority,
              status: task.status,
            },
          });
          notificationsSent++;
        }
      }
    }

    return {
      message: `Notifications sent for ${overdueTasks.length} overdue tasks`,
      overdueTasks: overdueTasks.length,
      notificationsSent,
    };
  }
}
