import { Injectable } from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/tenant-client';
import { TenantService } from '../../common/tenant/tenant.service';

@Injectable()
export class CourseApplicationsRepository {
  constructor(private readonly tenantService: TenantService) {}

  private async tenantPrisma(tenantId: string) {
    return this.tenantService.getTenantPrisma(tenantId);
  }

  async findStudentById(tenantId: string, studentId: string) {
    const prisma = await this.tenantPrisma(tenantId);
    return prisma.student.findFirst({
      where: { id: studentId, tenantId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  async findCourseWithUniversity(tenantId: string, courseId: string) {
    const prisma = await this.tenantPrisma(tenantId);
    return prisma.course.findFirst({
      where: { id: courseId, tenantId },
      include: {
        university: {
          select: {
            id: true,
            name: true,
            country: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
  }

  async findExistingByStudentAndCourse(tenantId: string, studentId: string, courseId: string) {
    const prisma = await this.tenantPrisma(tenantId);
    return prisma.courseApplication.findFirst({
      where: {
        tenantId,
        studentId,
        courseId,
      },
      select: { id: true },
    });
  }

  async createApplication(
    tenantId: string,
    data: {
      studentId: string;
      courseId: string;
      universityId: string;
      intakePeriod?: string;
      notes?: string;
    },
  ) {
    const prisma = await this.tenantPrisma(tenantId);

    return prisma.courseApplication.create({
      data: {
        tenantId,
        studentId: data.studentId,
        courseId: data.courseId,
        universityId: data.universityId,
        intakePeriod: data.intakePeriod,
        notes: data.notes ? ({ message: data.notes } as Prisma.JsonObject) : undefined,
        status: ApplicationStatus.Submitted,
        applicationDate: new Date(),
        submissionDate: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            duration: true,
            fees: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            country: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
  }

  async findMany(
    tenantId: string,
    where: {
      studentId?: string;
      courseId?: string;
      status?: ApplicationStatus;
    },
    page: number,
    limit: number,
  ) {
    const prisma = await this.tenantPrisma(tenantId);
    const skip = (page - 1) * limit;

    const prismaWhere: Prisma.CourseApplicationWhereInput = {
      tenantId,
      ...(where.studentId ? { studentId: where.studentId } : {}),
      ...(where.courseId ? { courseId: where.courseId } : {}),
      ...(where.status ? { status: where.status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.courseApplication.findMany({
        where: prismaWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          course: {
            select: {
              id: true,
              name: true,
              duration: true,
              fees: true,
            },
          },
          university: {
            select: {
              id: true,
              name: true,
              country: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      }),
      prisma.courseApplication.count({ where: prismaWhere }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(tenantId: string, id: string) {
    const prisma = await this.tenantPrisma(tenantId);
    return prisma.courseApplication.findFirst({
      where: { id, tenantId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            duration: true,
            requirements: true,
            intakePeriods: true,
            deadlines: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            ranking: true,
            country: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
  }

  async findTenantUserWithRole(tenantId: string, userId: string) {
    const prisma = await this.tenantPrisma(tenantId);
    return prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { role: true },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: 'Accepted' | 'Rejected',
    rejectionReason?: string,
  ) {
    const prisma = await this.tenantPrisma(tenantId);

    return prisma.courseApplication.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === ApplicationStatus.Rejected ? rejectionReason : null,
        decisionDate: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteById(tenantId: string, id: string) {
    const prisma = await this.tenantPrisma(tenantId);

    await prisma.courseApplication.delete({ where: { id } });
    return {
      success: true,
      message: 'Course application deleted successfully',
    };
  }
}
