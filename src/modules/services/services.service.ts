import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';
import { CreateServiceDto, UpdateServiceDto, AssignStudentToServiceDto, AssignMultipleStudentsDto } from './dto/service.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ServicesService {
  constructor(private tenantService: TenantService) {}

  /**
   * Create a new service
   */
  async createService(tenantId: string, createServiceDto: CreateServiceDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    return tenantPrisma.service.create({
      data: {
        tenantId,
        name: createServiceDto.name,
        description: createServiceDto.description,
        price: new Decimal(createServiceDto.price),
      },
      include: {
        studentServices: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get all services with pagination
   */
  async getAllServices(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    const [services, total] = await Promise.all([
      tenantPrisma.service.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          studentServices: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              studentServices: true,
              payments: true,
            },
          },
        },
      }),
      tenantPrisma.service.count({ where: { tenantId } }),
    ]);

    return {
      data: services,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a service by ID
   */
  async getServiceById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    
    const service = await tenantPrisma.service.findFirst({
      where: { id, tenantId },
      include: {
        studentServices: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
        _count: {
          select: {
            studentServices: true,
            payments: true,
            commissions: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  /**
   * Update a service
   */
  async updateService(tenantId: string, id: string, updateServiceDto: UpdateServiceDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    
    // Verify service exists
    await this.getServiceById(tenantId, id);

    const updateData: any = {};
    if (updateServiceDto.name !== undefined) updateData.name = updateServiceDto.name;
    if (updateServiceDto.description !== undefined) updateData.description = updateServiceDto.description;
    if (updateServiceDto.price !== undefined) updateData.price = new Decimal(updateServiceDto.price);

    return tenantPrisma.service.update({
      where: { id },
      data: updateData,
      include: {
        studentServices: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            studentServices: true,
            payments: true,
          },
        },
      },
    });
  }

  /**
   * Delete a service
   */
  async deleteService(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    
    // Verify service exists
    await this.getServiceById(tenantId, id);

    await tenantPrisma.service.delete({
      where: { id },
    });

    return { message: 'Service deleted successfully' };
  }

  /**
   * Assign a student to a service
   */
  async assignStudentToService(
    tenantId: string,
    serviceId: string,
    assignStudentDto: AssignStudentToServiceDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify service exists
    await this.getServiceById(tenantId, serviceId);

    // Verify student exists
    const student = await tenantPrisma.student.findFirst({
      where: { id: assignStudentDto.studentId, tenantId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if already assigned
    const existingAssignment = await tenantPrisma.studentService.findFirst({
      where: {
        studentId: assignStudentDto.studentId,
        serviceId: serviceId,
        tenantId,
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Student is already assigned to this service');
    }

    // Create assignment
    const assignment = await tenantPrisma.studentService.create({
      data: {
        tenantId,
        studentId: assignStudentDto.studentId,
        serviceId: serviceId,
        notes: assignStudentDto.notes,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
        },
      },
    });

    return assignment;
  }

  /**
   * Assign multiple students to a service
   */
  async assignMultipleStudents(
    tenantId: string,
    serviceId: string,
    assignMultipleDto: AssignMultipleStudentsDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify service exists
    await this.getServiceById(tenantId, serviceId);

    // Verify all students exist
    const students = await tenantPrisma.student.findMany({
      where: {
        id: { in: assignMultipleDto.studentIds },
        tenantId,
      },
    });

    if (students.length !== assignMultipleDto.studentIds.length) {
      throw new BadRequestException('One or more students not found');
    }

    // Get existing assignments to avoid duplicates
    const existingAssignments = await tenantPrisma.studentService.findMany({
      where: {
        studentId: { in: assignMultipleDto.studentIds },
        serviceId: serviceId,
        tenantId,
      },
      select: { studentId: true },
    });

    const existingStudentIds = new Set(existingAssignments.map(a => a.studentId));
    const newStudentIds = assignMultipleDto.studentIds.filter(id => !existingStudentIds.has(id));

    if (newStudentIds.length === 0) {
      throw new ConflictException('All students are already assigned to this service');
    }

    // Create assignments for new students
    const assignments = await tenantPrisma.studentService.createMany({
      data: newStudentIds.map(studentId => ({
        tenantId,
        studentId,
        serviceId,
        notes: assignMultipleDto.notes,
      })),
    });

    return {
      message: `Successfully assigned ${newStudentIds.length} student(s) to service`,
      assignedCount: assignments.count,
      skippedCount: existingStudentIds.size,
    };
  }

  /**
   * Unassign a student from a service
   */
  async unassignStudentFromService(tenantId: string, serviceId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Find the assignment
    const assignment = await tenantPrisma.studentService.findFirst({
      where: {
        studentId,
        serviceId,
        tenantId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Student assignment not found');
    }

    await tenantPrisma.studentService.delete({
      where: { id: assignment.id },
    });

    return { message: 'Student unassigned from service successfully' };
  }

  /**
   * Get all students assigned to a service
   */
  async getServiceStudents(tenantId: string, serviceId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'assignedAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    // Verify service exists
    await this.getServiceById(tenantId, serviceId);

    const [assignments, total] = await Promise.all([
      tenantPrisma.studentService.findMany({
        where: { serviceId, tenantId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      tenantPrisma.studentService.count({ where: { serviceId, tenantId } }),
    ]);

    return {
      data: assignments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all services assigned to a student
   */
  async getStudentServices(tenantId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify student exists
    const student = await tenantPrisma.student.findFirst({
      where: { id: studentId, tenantId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const assignments = await tenantPrisma.studentService.findMany({
      where: { studentId, tenantId },
      orderBy: { assignedAt: 'desc' },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            createdAt: true,
          },
        },
      },
    });

    return assignments;
  }
}
