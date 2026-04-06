import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';
import { CreateTestDto, UpdateTestDto, AssignTestToStudentDto, UpdateTestAssignmentDto, CreateTestBookingRequestDto, ApproveRejectTestBookingRequestDto } from './dto/test.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClient as TenantPrismaClient } from '@prisma/tenant-client';

@Injectable()
export class TestsService {
  private readonly reservationDurationMinutes = 15;

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

  /**
   * Create a new test
   */
  async createTest(tenantId: string, dto: CreateTestDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.ensureServiceExists(prisma, tenantId, dto.serviceId);

    return prisma.test.create({
      data: {
        service: { connect: { id: dto.serviceId } },
        name: dto.name,
        type: dto.type,
        description: dto.description,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        studentCapacity: dto.studentCapacity,
        reservationDurationMinutes: dto.reservationDurationMinutes || 15,
      },
      include: {
        service: { select: { id: true, name: true } },
        _count: { select: { assignments: true } },
      },
    });
  }

  /**
   * Get all tests with pagination
   */
  async getAllTests(tenantId: string, paginationDto: PaginationDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where: { service: { tenantId } },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          service: { select: { id: true, name: true } },
          _count: { select: { assignments: true } },
        },
      }),
      prisma.test.count({ where: { service: { tenantId } } }),
    ]);

    return {
      data: tests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a test by ID
   */
  async getTestById(tenantId: string, id: string) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const test = await prisma.test.findFirst({
      where: { id, service: { tenantId } },
      include: {
        service: { select: { id: true, name: true } },
        assignments: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, email: true, status: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { assignments: true } },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return test;
  }

  /**
   * Update a test
   */
  async updateTest(tenantId: string, id: string, dto: UpdateTestDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getTestById(tenantId, id);

    if (dto.serviceId !== undefined) {
      await this.ensureServiceExists(prisma, tenantId, dto.serviceId);
    }

    return prisma.test.update({
      where: { id },
      data: {
        ...(dto.serviceId !== undefined && { service: { connect: { id: dto.serviceId } } }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.scheduledDate !== undefined && { scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null }),
        ...(dto.studentCapacity !== undefined && { studentCapacity: dto.studentCapacity }),
        ...(dto.reservationDurationMinutes !== undefined && { reservationDurationMinutes: dto.reservationDurationMinutes }),
      },
      include: {
        service: { select: { id: true, name: true } },
        _count: { select: { assignments: true } },
      },
    });
  }

  /**
   * Delete a test
   */
  async deleteTest(tenantId: string, id: string) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getTestById(tenantId, id);

    await prisma.test.delete({ where: { id } });

    return { message: 'Test deleted successfully' };
  }

  /**
   * Assign a test to a student
   */
  async assignTestToStudent(tenantId: string, testId: string, dto: AssignTestToStudentDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    await this.getTestById(tenantId, testId);

    const student = await prisma.student.findFirst({ where: { id: dto.studentId, tenantId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const existing = await prisma.testAssignment.findFirst({
      where: { testId, studentId: dto.studentId },
    });
    if (existing) {
      throw new ConflictException('Test is already assigned to this student');
    }

    return prisma.testAssignment.create({
      data: { testId, studentId: dto.studentId, status: 'Pending' },
      include: {
        test: { select: { id: true, name: true, type: true, serviceId: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Update test assignment (score / status)
   */
  async updateTestAssignment(tenantId: string, assignmentId: string, dto: UpdateTestAssignmentDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const assignment = await prisma.testAssignment.findFirst({
      where: { id: assignmentId, test: { service: { tenantId } } },
      select: { id: true },
    });
    if (!assignment) {
      throw new NotFoundException('Test assignment not found');
    }

    return prisma.testAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.score !== undefined && { score: new Decimal(dto.score) }),
      },
      include: {
        test: { select: { id: true, name: true, type: true, serviceId: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Delete a test assignment
   */
  async deleteTestAssignment(tenantId: string, assignmentId: string) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const assignment = await prisma.testAssignment.findFirst({
      where: { id: assignmentId, test: { service: { tenantId } } },
      select: { id: true },
    });
    if (!assignment) {
      throw new NotFoundException('Test assignment not found');
    }

    await prisma.testAssignment.delete({ where: { id: assignmentId } });

    return { message: 'Test assignment deleted successfully' };
  }

  /**
   * Get all assignments for a test
   */
  async getTestAssignments(tenantId: string, testId: string, paginationDto: PaginationDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    await this.getTestById(tenantId, testId);

    const [assignments, total] = await Promise.all([
      prisma.testAssignment.findMany({
        where: { testId, test: { service: { tenantId } } },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true },
          },
        },
      }),
      prisma.testAssignment.count({ where: { testId, test: { service: { tenantId } } } }),
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
   * Get all booking requests for a specific test
   */
  async getTestBookingRequestsByTestId(tenantId: string, testId: string, paginationDto?: PaginationDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    
    // Ensure test exists
    await this.getTestById(tenantId, testId);
    
    const { page = 1, limit = 10, sortBy = 'requestedAt', sortOrder = 'desc' } = paginationDto || {};
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      prisma.testBookingRequest.findMany({
        where: {
          testId,
          tenantId,
          test: { service: { tenantId } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          test: { select: { id: true, name: true, type: true } },
          student: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      }),
      prisma.testBookingRequest.count({
        where: {
          testId,
          tenantId,
          test: { service: { tenantId } },
        },
      }),
    ]);

    return {
      data: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Request test participation (seat reservation)
   */
  async requestTestBooking(
    tenantId: string,
    testId: string,
    studentId: string,
    dto: CreateTestBookingRequestDto,
  ) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    return prisma.$transaction(async (tx: any) => {
      await this.expirePendingReservations(tx, tenantId);

      await tx.$executeRaw`SELECT id FROM tests WHERE id = ${testId} FOR UPDATE`;

      const test = await tx.test.findFirst({
        where: { id: testId, service: { tenantId } },
        select: { id: true, name: true, studentCapacity: true, reservationDurationMinutes: true },
      });

      if (!test) {
        throw new NotFoundException('Test not found');
      }

      const student = await tx.student.findFirst({
        where: { id: studentId, tenantId, isActive: true },
        select: { id: true },
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      const existingAssignment = await tx.testAssignment.findUnique({
        where: { testId_studentId: { testId, studentId } },
      });

      if (existingAssignment) {
        throw new ConflictException('Student is already registered for this test');
      }

      const existingPending = await tx.testBookingRequest.findFirst({
        where: {
          tenantId,
          testId,
          studentId,
          status: 'Pending',
          reservationExpiresAt: { gt: new Date() },
        },
        select: { id: true },
      });

      if (existingPending) {
        throw new ConflictException('A pending test booking request already exists');
      }

      const [activeAssignments, pendingReservations] = await Promise.all([
        tx.testAssignment.count({
          where: {
            testId,
          },
        }),
        tx.testBookingRequest.count({
          where: {
            tenantId,
            testId,
            status: 'Pending',
            reservationExpiresAt: { gt: new Date() },
          },
        }),
      ]);

      const occupiedSeats = activeAssignments + pendingReservations;

      if (occupiedSeats >= test.studentCapacity) {
        throw new ConflictException('Test is full. No seats are currently available');
      }

      const reservationExpiresAt = new Date(
        Date.now() + test.reservationDurationMinutes * 60 * 1000,
      );

      return tx.testBookingRequest.create({
        data: {
          tenantId,
          testId,
          studentId,
          notes: dto.notes,
          reservationExpiresAt,
        },
        include: {
          test: { select: { id: true, name: true, type: true } },
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
    });
  }

  /**
   * Get all test booking requests (for CRM panel)
   */
  async getTestBookingRequests(tenantId: string, filters?: { testId?: string; status?: string }, paginationDto?: PaginationDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = page ? (page - 1) * limit : 0;

    const where: any = { tenantId, test: { service: { tenantId } } };
    if (filters?.testId) where.testId = filters.testId;
    if (filters?.status) where.status = filters.status;

    const [requests, total] = await Promise.all([
      prisma.testBookingRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          test: { select: { id: true, name: true, type: true } },
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.testBookingRequest.count({ where }),
    ]);

    return {
      data: requests,
      total,
      page: page || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Approve a test booking request
   */
  async approveTestBookingRequest(tenantId: string, requestId: string, dto: ApproveRejectTestBookingRequestDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    return prisma.$transaction(async (tx: any) => {
      const request = await tx.testBookingRequest.findFirst({
        where: { id: requestId, tenantId },
        include: { test: true, student: true },
      });

      if (!request) {
        throw new NotFoundException('Test booking request not found');
      }

      if (request.status !== 'Pending') {
        throw new ConflictException(`Cannot approve a request with status: ${request.status}`);
      }

      // Check seat availability
      const [activeAssignments, pendingReservations] = await Promise.all([
        tx.testAssignment.count({
          where: { testId: request.testId },
        }),
        tx.testBookingRequest.count({
          where: {
            tenantId,
            testId: request.testId,
            status: 'Pending',
            id: { not: requestId },
            reservationExpiresAt: { gt: new Date() },
          },
        }),
      ]);

      const occupiedSeats = activeAssignments + pendingReservations;

      if (occupiedSeats >= request.test.studentCapacity) {
        throw new ConflictException('No seats available for this test');
      }

      // Create test assignment
      const assignment = await tx.testAssignment.create({
        data: {
          testId: request.testId,
          studentId: request.studentId,
          status: 'Pending',
        },
      });

      // Update request
      const updated = await tx.testBookingRequest.update({
        where: { id: requestId },
        data: {
          status: 'Approved',
          approvedAt: new Date(),
          approvedBy: dto.approvedBy,
        },
        include: {
          test: { select: { id: true, name: true, type: true } },
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      return { request: updated, assignment };
    });
  }

  /**
   * Reject a test booking request
   */
  async rejectTestBookingRequest(tenantId: string, requestId: string, dto: ApproveRejectTestBookingRequestDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const request = await prisma.testBookingRequest.findFirst({
      where: { id: requestId, tenantId },
    });

    if (!request) {
      throw new NotFoundException('Test booking request not found');
    }

    if (request.status !== 'Pending') {
      throw new ConflictException(`Cannot reject a request with status: ${request.status}`);
    }

    return prisma.testBookingRequest.update({
      where: { id: requestId },
      data: {
        status: 'Rejected',
        rejectedAt: new Date(),
        rejectedBy: dto.rejectedBy,
        rejectionReason: dto.rejectionReason,
      },
      include: {
        test: { select: { id: true, name: true, type: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Get student's test booking requests
   */
  async getStudentTestBookingRequests(tenantId: string, studentId: string, paginationDto?: PaginationDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10 } = paginationDto || {};
    const skip = page ? (page - 1) * limit : 0;

    const [requests, total] = await Promise.all([
      prisma.testBookingRequest.findMany({
        where: { tenantId, studentId },
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          test: { select: { id: true, name: true, type: true, scheduledDate: true } },
        },
      }),
      prisma.testBookingRequest.count({ where: { tenantId, studentId } }),
    ]);

    return {
      data: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cancel a test booking request
   */
  async cancelTestBookingRequest(tenantId: string, requestId: string, studentId: string) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const request = await prisma.testBookingRequest.findFirst({
      where: { id: requestId, tenantId, studentId },
    });

    if (!request) {
      throw new NotFoundException('Test booking request not found');
    }

    if (request.status !== 'Pending') {
      throw new ConflictException('Can only cancel requests with Pending status');
    }

    return prisma.testBookingRequest.update({
      where: { id: requestId },
      data: { status: 'Cancelled' },
    });
  }

  private async expirePendingReservations(prisma: TenantPrismaClient, tenantId: string) {
    await prisma.testBookingRequest.updateMany({
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
}
