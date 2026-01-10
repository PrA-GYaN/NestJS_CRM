import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private tenantService: TenantService,
  ) {}

  async createAppointment(tenantId: string, data: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    return tenantPrisma.appointment.create({
      data: {
        ...data,
        tenantId,
      },
      include: {
        student: true,
        staff: true,
      },
    });
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

  async updateAppointment(tenantId: string, id: string, data: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getAppointmentById(tenantId, id);

    return tenantPrisma.appointment.update({
      where: { id },
      data,
      include: {
        student: true,
        staff: true,
      },
    });
  }

  async deleteAppointment(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getAppointmentById(tenantId, id);

    await tenantPrisma.appointment.delete({
      where: { id },
    });

    return { success: true, message: 'Appointment deleted successfully' };
  }
}
