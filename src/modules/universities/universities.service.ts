import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class UniversitiesService {
  constructor(private tenantService: TenantService) {}

  async createUniversity(tenantId: string, data: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    return tenantPrisma.university.create({
      data,
    });
  }

  async getAllUniversities(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as any } },
            { country: { contains: search, mode: 'insensitive' as any } },
          ],
        }
      : {};

    const [universities, total] = await Promise.all([
      tenantPrisma.university.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          courses: true,
        },
      }),
      tenantPrisma.university.count({ where }),
    ]);

    return {
      data: universities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUniversityById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const university = await tenantPrisma.university.findUnique({
      where: { id },
      include: {
        courses: true,
        commissions: true,
      },
    });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    return university;
  }

  async updateUniversity(tenantId: string, id: string, data: any) {
    await this.getUniversityById(tenantId, id);
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    return tenantPrisma.university.update({
      where: { id },
      data,
    });
  }

  async deleteUniversity(tenantId: string, id: string) {
    await this.getUniversityById(tenantId, id);
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await tenantPrisma.university.delete({
      where: { id },
    });
    return { success: true, message: 'University deleted successfully' };
  }

  async createCourse(tenantId: string, universityId: string, data: any) {
    await this.getUniversityById(tenantId, universityId);
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    return tenantPrisma.course.create({
      data: {
        ...data,
        universityId,
      },
      include: {
        university: true,
      },
    });
  }

  async getCoursesByUniversity(tenantId: string, universityId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    return tenantPrisma.course.findMany({
      where: { universityId },
      include: {
        university: true,
      },
    });
  }

  async updateCourse(tenantId: string, id: string, data: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    return tenantPrisma.course.update({
      where: { id },
      data,
      include: {
        university: true,
      },
    });
  }
}
