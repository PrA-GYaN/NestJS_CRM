import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateStudentDto, UpdateStudentDto, UploadDocumentDto } from './dto/students.dto';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class StudentsService {
  constructor(
    private tenantService: TenantService,
  ) {}

  async createStudent(tenantId: string, createStudentDto: CreateStudentDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    return tenantPrisma.student.create({
      data: {
        ...createStudentDto,
        tenantId,
      },
      include: {
        lead: true,
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
        ...uploadDocumentDto,
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
}
