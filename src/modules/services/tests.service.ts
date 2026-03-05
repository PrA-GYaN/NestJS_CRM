import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';
import { CreateTestDto, UpdateTestDto, AssignTestToStudentDto, UpdateTestAssignmentDto } from './dto/test.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TestsService {
  constructor(private tenantService: TenantService) {}

  /**
   * Create a new test (global, not tenant-scoped)
   */
  async createTest(tenantId: string, dto: CreateTestDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    return prisma.test.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
      },
      include: {
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
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { assignments: true } },
        },
      }),
      prisma.test.count(),
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

    const test = await prisma.test.findUnique({
      where: { id },
      include: {
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

    return prisma.test.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: {
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
        test: { select: { id: true, name: true, type: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Update test assignment (score / status)
   */
  async updateTestAssignment(tenantId: string, assignmentId: string, dto: UpdateTestAssignmentDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const assignment = await prisma.testAssignment.findUnique({ where: { id: assignmentId } });
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
        test: { select: { id: true, name: true, type: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Delete a test assignment
   */
  async deleteTestAssignment(tenantId: string, assignmentId: string) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    const assignment = await prisma.testAssignment.findUnique({ where: { id: assignmentId } });
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
        where: { testId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true },
          },
        },
      }),
      prisma.testAssignment.count({ where: { testId } }),
    ]);

    return {
      data: assignments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
