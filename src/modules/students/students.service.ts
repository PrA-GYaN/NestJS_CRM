import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateStudentDto, UpdateStudentDto, UploadDocumentDto, AssignCounselorDto } from './dto/students.dto';
import { PaginationDto } from '../../common/dto/common.dto';
import { DocumentType } from '@prisma/tenant-client';

@Injectable()
export class StudentsService {
  constructor(
    private tenantService: TenantService,
  ) { }

  async createStudent(tenantId: string, createStudentDto: CreateStudentDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Auto-generate password as firstName@lastName (system-managed)
    const rawPassword = `${createStudentDto.firstName}@${createStudentDto.lastName}`;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Validate assigned counselor if provided
    if (createStudentDto.assignedCounselorId) {
      await this.validateCounselor(tenantPrisma, tenantId, createStudentDto.assignedCounselorId);
    }

    return tenantPrisma.student.create({
      data: {
        ...createStudentDto,
        tenantId,
        password: hashedPassword,
        isActive: true,
      },
      include: {
        lead: true,
        assignedCounselor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getAllStudents(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as any } },
          { lastName: { contains: search, mode: 'insensitive' as any } },
          { email: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [students, total] = await Promise.all([
      tenantPrisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          lead: true,
          documents: true,
        },
      }),
      tenantPrisma.student.count({ where }),
    ]);

    return {
      data: students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStudentById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const student = await tenantPrisma.student.findFirst({
      where: { id, tenantId },
      include: {
        lead: true,
        documents: true,
        appointments: true,
        classEnrollments: {
          include: {
            class: true,
          },
        },
        testAssignments: {
          include: {
            test: true,
          },
        },
        visaApplications: true,
        payments: true,
        assignedCounselor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async updateStudent(tenantId: string, id: string, updateStudentDto: UpdateStudentDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getStudentById(tenantId, id);

    return tenantPrisma.student.update({
      where: { id },
      data: updateStudentDto,
      include: {
        lead: true,
        documents: true,
        assignedCounselor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async deleteStudent(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getStudentById(tenantId, id);

    await tenantPrisma.student.delete({
      where: { id },
    });

    return { success: true, message: 'Student deleted successfully' };
  }

  async uploadDocument(tenantId: string, studentId: string, uploadDocumentDto: UploadDocumentDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getStudentById(tenantId, studentId);

    return tenantPrisma.studentDocument.create({
      data: {
        tenantId,
        studentId,
        documentType: uploadDocumentDto.documentType as DocumentType,
        filePath: uploadDocumentDto.filePath,
      },
    });
  }

  async getStudentDocuments(tenantId: string, studentId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getStudentById(tenantId, studentId);

    return tenantPrisma.studentDocument.findMany({
      where: { studentId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /**
   * Assign a Counselor-role staff member to a student.
   * Only Admin users are permitted to call this (enforced at controller level).
   */
  async assignCounselor(tenantId: string, studentId: string, dto: AssignCounselorDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getStudentById(tenantId, studentId);
    await this.validateCounselor(tenantPrisma, tenantId, dto.counselorId);

    return tenantPrisma.student.update({
      where: { id: studentId },
      data: { assignedCounselorId: dto.counselorId },
      include: {
        lead: true,
        assignedCounselor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Verify that a user exists, belongs to the tenant, and has the Counselor role.
   */
  private async validateCounselor(tenantPrisma: any, tenantId: string, counselorId: string) {
    const staff = await tenantPrisma.user.findFirst({
      where: { id: counselorId, tenantId },
      include: { role: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    if (staff.role.name.toLowerCase() !== 'counselor') {
      throw new BadRequestException(
        'Only staff members with the Counselor role can be assigned to students',
      );
    }
  }
}
