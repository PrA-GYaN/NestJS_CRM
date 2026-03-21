import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateStudentDto, UpdateStudentDto, UploadDocumentDto, UpdateStudentDocumentDto, AssignCounselorDto } from './dto/students.dto';
import { PaginationDto } from '../../common/dto/common.dto';
import { DocumentType, DocumentVerificationStatus } from '@prisma/tenant-client';

@Injectable()
export class StudentsService {
  constructor(
    private tenantService: TenantService,
  ) { }

  private sanitizeApplicantResponse(student: any) {
    const counselorRoleName = student.assignedCounselor?.role?.name?.toLowerCase();

    return {
      id: student.id,
      firstName:student.firstName,
      lastName:student.lastName,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      phone: student.phone,
      isActive: student.isActive,
      emailVerified: student.emailVerified,
      createdDate: student.createdAt,
      status: student.status,
      priority: student.priority,
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
            class: {
              include: {
                instructor: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        classBookingRequests: {
          include: {
            class: {
              include: {
                instructor: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
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
        fileName: uploadDocumentDto.fileName,
        fileSize: uploadDocumentDto.fileSize,
        expiryDate: uploadDocumentDto.expiryDate ? new Date(uploadDocumentDto.expiryDate) : undefined,
        metadata: uploadDocumentDto.metadata,
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
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getStudentById(tenantId, studentId);

    const document = await tenantPrisma.studentDocument.findFirst({
      where: { id: documentId, studentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await tenantPrisma.studentDocument.delete({
      where: { id: documentId },
    });

    return { success: true, message: 'Document deleted successfully' };
  }

  async updateStudentDocument(
    tenantId: string,
    studentId: string,
    documentId: string,
    updateDocumentDto: UpdateStudentDocumentDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getStudentById(tenantId, studentId);

    const existingDocument = await tenantPrisma.studentDocument.findFirst({
      where: { id: documentId, studentId, tenantId },
    });

    if (!existingDocument) {
      throw new NotFoundException('Document not found');
    }

    const hasUpdates = Object.values(updateDocumentDto).some((value) => value !== undefined);
    if (!hasUpdates) {
      throw new BadRequestException('At least one updatable field is required');
    }

    if (updateDocumentDto.verifiedBy) {
      const verifier = await tenantPrisma.user.findFirst({
        where: { id: updateDocumentDto.verifiedBy, tenantId },
      });
      if (!verifier) {
        throw new NotFoundException('Verifier user not found');
      }
    }

    const data: any = {
      ...(updateDocumentDto.documentType !== undefined && {
        documentType: updateDocumentDto.documentType as DocumentType,
      }),
      ...(updateDocumentDto.filePath !== undefined && { filePath: updateDocumentDto.filePath }),
      ...(updateDocumentDto.fileName !== undefined && { fileName: updateDocumentDto.fileName }),
      ...(updateDocumentDto.fileSize !== undefined && { fileSize: updateDocumentDto.fileSize }),
      ...(updateDocumentDto.version !== undefined && { version: updateDocumentDto.version }),
      ...(updateDocumentDto.verificationStatus !== undefined && {
        verificationStatus: updateDocumentDto.verificationStatus as DocumentVerificationStatus,
      }),
      ...(updateDocumentDto.verifiedBy !== undefined && { verifiedBy: updateDocumentDto.verifiedBy }),
      ...(updateDocumentDto.verificationDate !== undefined && {
        verificationDate: new Date(updateDocumentDto.verificationDate),
      }),
      ...(updateDocumentDto.verificationNotes !== undefined && {
        verificationNotes: updateDocumentDto.verificationNotes,
      }),
      ...(updateDocumentDto.rejectionReason !== undefined && {
        rejectionReason: updateDocumentDto.rejectionReason,
      }),
      ...(updateDocumentDto.expiryDate !== undefined && {
        expiryDate: new Date(updateDocumentDto.expiryDate),
      }),
      ...(updateDocumentDto.metadata !== undefined && { metadata: updateDocumentDto.metadata }),
    };

    return tenantPrisma.studentDocument.update({
      where: { id: documentId },
      data,
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
