import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';
import {
  CreateClassDto,
  UpdateClassDto,
  EnrollStudentInClassDto,
  UpdateEnrollmentStatusDto,
  CreateClassBookingRequestDto,
  ClassDayTimingDto,
  ClassDayOfWeek,
} from './dto/class.dto';
import { PrismaClient as TenantPrismaClient, Prisma } from '@prisma/tenant-client';

@Injectable()
export class ClassesService {
  constructor(private tenantService: TenantService) {}

  private async ensureServiceExists(
    prisma: TenantPrismaClient,
    tenantId: string,
    serviceId: string,
  ) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId },
      select: { id: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }
  }

  private async expirePendingReservations(prisma: TenantPrismaClient, tenantId: string) {
    await prisma.classBookingRequest.updateMany({
      where: {
        tenantId,
        status: 'Pending',
        reservationExpiresAt: {
          lte: new Date(),
        },
      },
      data: {
        status: 'Expired',
      },
    });
  }

  private normalizeSchedule(schedule: ClassDayTimingDto[]): Prisma.InputJsonValue {
    const uniqueDays = new Set<ClassDayOfWeek>();

    for (const timing of schedule) {
      if (uniqueDays.has(timing.day)) {
        throw new BadRequestException(`Duplicate day in class schedule: ${timing.day}`);
      }

      if (timing.endTime <= timing.startTime) {
        throw new BadRequestException(`endTime must be later than startTime for ${timing.day}`);
      }

      uniqueDays.add(timing.day);
    }

    return schedule.map((timing) => ({
      day: timing.day,
      startTime: timing.startTime,
      endTime: timing.endTime,
    })) as Prisma.InputJsonValue;
  }

  /**
   * Create a new class
   */
  async createClass(tenantId: string, dto: CreateClassDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.ensureServiceExists(prisma, tenantId, dto.serviceId);

    const data: Prisma.ClassCreateInput = {
      tenantId,
      name: dto.name,
      description: dto.description,
      schedule: this.normalizeSchedule(dto.schedule),
      studentCapacity: dto.studentCapacity,
      reservationDurationMinutes: dto.reservationDurationMinutes || 15,
      service: { connect: { id: dto.serviceId } },
      ...(dto.instructorId && { instructor: { connect: { id: dto.instructorId } } }),
    };

    return prisma.class.create({
      data,
      include: {
        service: { select: { id: true, name: true } },
        instructor: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  /**
   * Get all classes with pagination
   */
  async getAllClasses(tenantId: string, paginationDto: PaginationDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          service: { select: { id: true, name: true } },
          instructor: { select: { id: true, name: true, email: true } },
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.class.count({ where: { tenantId } }),
    ]);

    return {
      data: classes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a class by ID
   */
  async getClassById(tenantId: string, id: string) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const cls = await prisma.class.findFirst({
      where: { id, tenantId },
      include: {
        service: { select: { id: true, name: true } },
        instructor: { select: { id: true, name: true, email: true } },
        enrollments: {
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
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!cls) {
      throw new NotFoundException('Class not found');
    }

    return cls;
  }

  /**
   * Update a class
   */
  async updateClass(tenantId: string, id: string, dto: UpdateClassDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getClassById(tenantId, id);

    if (dto.serviceId !== undefined) {
      await this.ensureServiceExists(prisma, tenantId, dto.serviceId);
    }

    const data: Prisma.ClassUpdateInput = {
      ...(dto.serviceId !== undefined && { service: { connect: { id: dto.serviceId } } }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.schedule !== undefined && { schedule: this.normalizeSchedule(dto.schedule) }),
      ...(dto.studentCapacity !== undefined && { studentCapacity: dto.studentCapacity }),
      ...(dto.reservationDurationMinutes !== undefined && {
        reservationDurationMinutes: dto.reservationDurationMinutes,
      }),
      ...(dto.instructorId !== undefined && { instructor: { connect: { id: dto.instructorId } } }),
    };

    return prisma.class.update({
      where: { id },
      data,
      include: {
        service: { select: { id: true, name: true } },
        instructor: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  /**
   * Delete a class
   */
  async deleteClass(tenantId: string, id: string) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getClassById(tenantId, id);

    await prisma.class.delete({ where: { id } });

    return { message: 'Class deleted successfully' };
  }

  /**
   * Enroll a student in a class
   */
  async enrollStudent(tenantId: string, classId: string, dto: EnrollStudentInClassDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    await this.getClassById(tenantId, classId);

    const student = await prisma.student.findFirst({ where: { id: dto.studentId, tenantId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const existing = await prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId: dto.studentId } },
    });
    if (existing) {
      throw new ConflictException('Student is already enrolled in this class');
    }

    return prisma.classEnrollment.create({
      data: { classId, studentId: dto.studentId, status: 'Active' },
      include: {
        class: { select: { id: true, name: true, schedule: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async requestClassBooking(
    tenantId: string,
    classId: string,
    studentId: string,
    dto: CreateClassBookingRequestDto,
  ) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    return prisma.$transaction(async (tx: any) => {
      await this.expirePendingReservations(tx, tenantId);

      await tx.$executeRaw`SELECT id FROM classes WHERE id = ${classId} FOR UPDATE`;

      const cls = await tx.class.findFirst({
        where: { id: classId, tenantId },
        select: { id: true, name: true, studentCapacity: true, reservationDurationMinutes: true },
      });

      if (!cls) {
        throw new NotFoundException('Class not found');
      }

      const student = await tx.student.findFirst({
        where: { id: studentId, tenantId, isActive: true },
        select: { id: true },
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      const existingEnrollment = await tx.classEnrollment.findUnique({
        where: { classId_studentId: { classId, studentId } },
      });

      if (existingEnrollment) {
        throw new ConflictException('Student is already enrolled in this class');
      }

      const existingPending = await tx.classBookingRequest.findFirst({
        where: {
          tenantId,
          classId,
          studentId,
          status: 'Pending',
          reservationExpiresAt: { gt: new Date() },
        },
        select: { id: true },
      });

      if (existingPending) {
        throw new ConflictException('A pending class booking request already exists');
      }

      const [activeEnrollments, pendingReservations] = await Promise.all([
        tx.classEnrollment.count({
          where: {
            classId,
            status: 'Active',
          },
        }),
        tx.classBookingRequest.count({
          where: {
            tenantId,
            classId,
            status: 'Pending',
            reservationExpiresAt: { gt: new Date() },
          },
        }),
      ]);

      const occupiedSeats = activeEnrollments + pendingReservations;

      if (occupiedSeats >= cls.studentCapacity) {
        throw new ConflictException('Class is full. No seats are currently available');
      }

      const reservationExpiresAt = new Date(
        Date.now() + cls.reservationDurationMinutes * 60 * 1000,
      );

      return tx.classBookingRequest.create({
        data: {
          tenantId,
          classId,
          studentId,
          status: 'Pending',
          notes: dto.notes,
          reservationExpiresAt,
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              studentCapacity: true,
            },
          },
        },
      });
    });
  }

  async getClassBookingRequests(tenantId: string, classId: string, paginationDto: PaginationDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'requestedAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    await this.getClassById(tenantId, classId);
    await this.expirePendingReservations(prisma, tenantId);

    const [data, total] = await Promise.all([
      prisma.classBookingRequest.findMany({
        where: {
          tenantId,
          classId,
          // Exclude Approved requests as they are already in enrolled response
          NOT: { status: 'Approved' },
        },
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
            },
          },
        },
      }),
      prisma.classBookingRequest.count({
        where: {
          tenantId,
          classId,
          // Exclude Approved requests as they are already in enrolled response
          NOT: { status: 'Approved' },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveClassBookingRequest(tenantId: string, requestId: string, approverId: string) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    return prisma.$transaction(async (tx: any) => {
      await this.expirePendingReservations(tx, tenantId);

      const request = await tx.classBookingRequest.findFirst({
        where: { id: requestId, tenantId },
      });

      if (!request) {
        throw new NotFoundException('Class booking request not found');
      }

      if (request.status !== 'Pending') {
        throw new BadRequestException('Only pending requests can be approved');
      }

      if (request.reservationExpiresAt && request.reservationExpiresAt <= new Date()) {
        await tx.classBookingRequest.update({
          where: { id: request.id },
          data: { status: 'Expired' },
        });
        throw new ConflictException('Class booking request has expired');
      }

      await tx.$executeRaw`SELECT id FROM classes WHERE id = ${request.classId} FOR UPDATE`;

      const cls = await tx.class.findFirst({
        where: { id: request.classId, tenantId },
        select: { id: true, studentCapacity: true, name: true },
      });

      if (!cls) {
        throw new NotFoundException('Class not found');
      }

      const [activeEnrollments, otherPendingReservations] = await Promise.all([
        tx.classEnrollment.count({
          where: {
            classId: request.classId,
            status: 'Active',
          },
        }),
        tx.classBookingRequest.count({
          where: {
            tenantId,
            classId: request.classId,
            status: 'Pending',
            reservationExpiresAt: { gt: new Date() },
            id: { not: request.id },
          },
        }),
      ]);

      if (activeEnrollments + otherPendingReservations >= cls.studentCapacity) {
        throw new ConflictException(
          'Cannot approve request because class capacity has been reached',
        );
      }

      const existingEnrollment = await tx.classEnrollment.findUnique({
        where: {
          classId_studentId: {
            classId: request.classId,
            studentId: request.studentId,
          },
        },
      });

      if (!existingEnrollment) {
        await tx.classEnrollment.create({
          data: {
            classId: request.classId,
            studentId: request.studentId,
            status: 'Active',
          },
        });
      }

      return tx.classBookingRequest.update({
        where: { id: request.id },
        data: {
          status: 'Approved',
          approvedAt: new Date(),
          approvedBy: approverId,
          reservationExpiresAt: null,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              studentCapacity: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    });
  }

  async rejectClassBookingRequest(
    tenantId: string,
    requestId: string,
    rejectedBy: string,
    reason?: string,
  ) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const request = await prisma.classBookingRequest.findFirst({
      where: { id: requestId, tenantId },
      select: { id: true, status: true },
    });

    if (!request) {
      throw new NotFoundException('Class booking request not found');
    }

    if (request.status !== 'Pending') {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    return prisma.classBookingRequest.update({
      where: { id: request.id },
      data: {
        status: 'Rejected',
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason: reason,
        reservationExpiresAt: null,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            studentCapacity: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update enrollment status
   */
  async updateEnrollmentStatus(
    tenantId: string,
    classId: string,
    studentId: string,
    dto: UpdateEnrollmentStatusDto,
  ) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const enrollment = await prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId } },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return prisma.classEnrollment.update({
      where: { classId_studentId: { classId, studentId } },
      data: { status: dto.status },
      include: {
        class: { select: { id: true, name: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Unenroll a student from a class
   */
  async unenrollStudent(tenantId: string, classId: string, studentId: string) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const enrollment = await prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId } },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    await prisma.classEnrollment.delete({
      where: { classId_studentId: { classId, studentId } },
    });

    return { message: 'Student unenrolled from class successfully' };
  }

  /**
   * Get all students enrolled in a class
   */
  async getClassStudents(tenantId: string, classId: string, paginationDto: PaginationDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    await this.getClassById(tenantId, classId);

    const [enrollments, total] = await Promise.all([
      prisma.classEnrollment.findMany({
        where: { classId },
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
            },
          },
        },
      }),
      prisma.classEnrollment.count({ where: { classId } }),
    ]);

    return {
      data: enrollments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
