import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class UniversitiesService {
  constructor(private tenantService: TenantService) {}

  async createUniversity(tenantId: string, data: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    
    // Verify country exists if countryId is provided
    if (data.countryId) {
      const country = await tenantPrisma.country.findFirst({
        where: { id: data.countryId, tenantId },
      });
      if (!country) {
        throw new NotFoundException('Country not found');
      }
    }

    return tenantPrisma.university.create({
      data: {
        ...data,
        tenantId,
      },
      include: {
        country: true,
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });
  }

  async getAllUniversities(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [universities, total] = await Promise.all([
      tenantPrisma.university.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          country: true,
          _count: {
            select: {
              courses: true,
            },
          },
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
    const university = await tenantPrisma.university.findFirst({
      where: { id, tenantId },
      include: {
        country: true,
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
    
    // Verify country exists if countryId is being updated
    if (data.countryId) {
      const country = await tenantPrisma.country.findFirst({
        where: { id: data.countryId, tenantId },
      });
      if (!country) {
        throw new NotFoundException('Country not found');
      }
    }

    return tenantPrisma.university.update({
      where: { id },
      data,
      include: {
        country: true,
      },
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
        tenantId,
      },
      include: {
        university: {
          include: {
            country: true,
          },
        },
      },
    });
  }

  async getCoursesByUniversity(tenantId: string, universityId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    return tenantPrisma.course.findMany({
      where: { universityId, tenantId },
      include: {
        university: {
          include: {
            country: true,
          },
        },
      },
    });
  }

  async updateCourse(tenantId: string, id: string, data: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    
    // Verify course exists and belongs to tenant
    const course = await tenantPrisma.course.findFirst({
      where: { id, tenantId },
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return tenantPrisma.course.update({
      where: { id },
      data,
      include: {
        university: {
          include: {
            country: true,
          },
        },
      },
    });
  }
}
