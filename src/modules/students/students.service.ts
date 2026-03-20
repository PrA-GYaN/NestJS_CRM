import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateStudentDto, UpdateStudentDto, UploadDocumentDto, AssignCounselorDto } from './dto/students.dto';
import { PaginationDto } from '../../common/dto/common.dto';
import { DocumentType } from '@prisma/tenant-client';
import { FilesService } from '../files/files.service';

@Injectable()
export class StudentsService {
  constructor(
    private tenantService: TenantService,
    private filesService: FilesService,
  ) { }

  private sanitizeApplicantResponse(student: any) {
    const counselorRoleName = student.assignedCounselor?.role?.name?.toLowerCase();

    return {
      ...student,
      name: undefined,
      email: undefined,
      phone: undefined,
      isActive: undefined,
      emailVerified: undefined,
      status: undefined,
      priority: undefined,
      createdDate: undefined,
      createdAt: undefined,
      assignedCounselor:
        counselorRoleName === 'counselor'
          ? { name: student.assignedCounselor?.name ?? null }
          : null,
    };
  }

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
          assignedCounselor: {
            select: {
              name: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      tenantPrisma.student.count({ where }),
    ]);

    return {
      data: students.map((student: any) => this.sanitizeApplicantResponse(student)),
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
        appointments: {
          include: {
            staff: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        classEnrollments: {
          include: {
            class: true,
          },
        },
        classBookingRequests: {
          include: {
            class: true,
          },
        },
        testAssignments: {
          include: {
            test: true,
          },
        },
        visaApplications: {
          include: {
            visaType: true,
            documents: true,
          },
        },
        payments: {
          include: {
            service: true,
          },
        },
        courseApplications: {
          include: {
            course: true,
            university: true,
          },
        },
        studentServices: {
          include: {
            service: true,
          },
        },
        serviceBookingRequests: {
          include: {
            service: true,
          },
        },
        studentNotifications: true,
        assignedCounselor: {
          select: {
            name: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.sanitizeApplicantResponse(student);
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

  async deleteStudentDocument(tenantId: string, studentId: string, documentId: string) {
    await this.getStudentById(tenantId, studentId);
    return this.filesService.deleteStudentDocument(tenantId, studentId, documentId);
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
