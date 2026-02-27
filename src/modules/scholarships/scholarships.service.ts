import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateScholarshipDto, UpdateScholarshipDto } from './dto/scholarship.dto';
import { PaginationDto } from '../../common/dto/common.dto';
import { ContentStatus } from '../blogs/dto/blog.dto';

@Injectable()
export class ScholarshipsService {
  constructor(private tenantService: TenantService) {}

  async createScholarship(tenantId: string, createScholarshipDto: CreateScholarshipDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if slug already exists for this tenant
    const existingScholarship = await tenantPrisma.scholarship.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug: createScholarshipDto.slug,
        },
      },
    });

    if (existingScholarship) {
      throw new BadRequestException('Scholarship with this slug already exists');
    }

    return tenantPrisma.scholarship.create({
      data: {
        ...createScholarshipDto,
        tenantId,
        deadline: new Date(createScholarshipDto.deadline),
        status: ContentStatus.Draft,
      },
    });
  }

  async getAllScholarships(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'deadline', sortOrder = 'asc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as any } },
          { description: { contains: search, mode: 'insensitive' as any } },
          { universityName: { contains: search, mode: 'insensitive' as any } },
          { countryName: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [scholarships, total] = await Promise.all([
      tenantPrisma.scholarship.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      tenantPrisma.scholarship.count({ where }),
    ]);

    return {
      data: scholarships,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getScholarshipById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const scholarship = await tenantPrisma.scholarship.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!scholarship) {
      throw new NotFoundException('Scholarship not found');
    }

    return scholarship;
  }

  async getScholarshipBySlug(tenantId: string, slug: string, publicAccess = false) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const where: any = {
      tenantId,
      slug,
    };

    // For public access, only return published scholarships
    if (publicAccess) {
      where.status = ContentStatus.Published;
      where.publishedAt = {
        lte: new Date(),
      };
    }

    const scholarship = await tenantPrisma.scholarship.findFirst({
      where,
    });

    if (!scholarship) {
      throw new NotFoundException('Scholarship not found');
    }

    return scholarship;
  }

  async updateScholarship(tenantId: string, id: string, updateScholarshipDto: UpdateScholarshipDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if scholarship exists
    await this.getScholarshipById(tenantId, id);

    // If updating slug, check if new slug is unique
    if (updateScholarshipDto.slug) {
      const existingScholarship = await tenantPrisma.scholarship.findFirst({
        where: {
          tenantId,
          slug: updateScholarshipDto.slug,
          NOT: { id },
        },
      });

      if (existingScholarship) {
        throw new BadRequestException('Scholarship with this slug already exists');
      }
    }

    return tenantPrisma.scholarship.update({
      where: { id },
      data: {
        ...updateScholarshipDto,
        ...(updateScholarshipDto.deadline && {
          deadline: new Date(updateScholarshipDto.deadline),
        }),
      },
    });
  }

  async publishScholarship(tenantId: string, id: string, publish: boolean) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if scholarship exists
    await this.getScholarshipById(tenantId, id);

    return tenantPrisma.scholarship.update({
      where: { id },
      data: {
        status: publish ? ContentStatus.Published : ContentStatus.Unpublished,
        publishedAt: publish ? new Date() : null,
      },
    });
  }

  async deleteScholarship(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if scholarship exists
    await this.getScholarshipById(tenantId, id);

    await tenantPrisma.scholarship.delete({
      where: { id },
    });

    return { message: 'Scholarship deleted successfully' };
  }

  async getActiveScholarships(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    return tenantPrisma.scholarship.findMany({
      where: {
        tenantId,
        status: ContentStatus.Published,
        deadline: {
          gte: new Date(),
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    });
  }
}
