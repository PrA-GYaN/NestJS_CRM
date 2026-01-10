import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class TasksService {
  constructor(
    private tenantService: TenantService,
  ) {}

  async createTask(tenantId: string, data: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    return tenantPrisma.task.create({
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

  async updateTask(tenantId: string, id: string, data: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getTaskById(tenantId, id);

    return tenantPrisma.task.update({
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
  }

  async deleteTask(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getTaskById(tenantId, id);

    await tenantPrisma.task.delete({
      where: { id },
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
}
