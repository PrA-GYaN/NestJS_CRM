import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';
import { CreateClassDto, UpdateClassDto, EnrollStudentInClassDto, UpdateEnrollmentStatusDto } from './dto/class.dto';

@Injectable()
export class ClassesService {
  constructor(private tenantService: TenantService) {}

  /**
   * Create a new class
   */
  async createClass(tenantId: string, dto: CreateClassDto) {
    const prisma = await this.tenantService.getTenantPrisma(tenantId);

    return prisma.class.create({
      data: {
        tenantId,
        level: dto.level,
        schedule: dto.schedule,
        courseId: dto.courseId,
        instructorId: dto.instructorId,
      },
      include: {
        course: { select: { id: true, name: true } },
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
          course: { select: { id: true, name: true } },
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
        course: { select: { id: true, name: true, fees: true, duration: true } },
        instructor: { select: { id: true, name: true, email: true } },
        enrollments: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true },
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

    return prisma.class.update({
      where: { id },
      data: {
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.schedule !== undefined && { schedule: dto.schedule }),
        ...(dto.courseId !== undefined && { courseId: dto.courseId }),
        ...(dto.instructorId !== undefined && { instructorId: dto.instructorId }),
      },
      include: {
        course: { select: { id: true, name: true } },
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
        class: { select: { id: true, level: true, schedule: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
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
        class: { select: { id: true, level: true } },
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
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true },
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
