import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateLandingPageDto, UpdateLandingPageDto } from './dto/landing-page.dto';
import { PaginationDto } from '../../common/dto/common.dto';
import { ContentStatus } from '../blogs/dto/blog.dto';

@Injectable()
export class LandingPagesService {
  constructor(private tenantService: TenantService) {}

  async createLandingPage(tenantId: string, createLandingPageDto: CreateLandingPageDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if slug already exists for this tenant
    const existingPage = await tenantPrisma.landingPage.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug: createLandingPageDto.slug,
        },
      },
    });

    if (existingPage) {
      throw new BadRequestException('Landing page with this slug already exists');
    }

    return tenantPrisma.landingPage.create({
      data: {
        ...createLandingPageDto,
        tenantId,
        status: ContentStatus.Draft,
      },
    });
  }

  async getAllLandingPages(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as any } },
          { content: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [pages, total] = await Promise.all([
      tenantPrisma.landingPage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      tenantPrisma.landingPage.count({ where }),
    ]);

    return {
      data: pages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLandingPageById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const page = await tenantPrisma.landingPage.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    return page;
  }

  async getLandingPageBySlug(tenantId: string, slug: string, publicAccess = false) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const where: any = {
      tenantId,
      slug,
    };

    // For public access, only return published pages
    if (publicAccess) {
      where.status = ContentStatus.Published;
      where.publishedAt = {
        lte: new Date(),
      };
    }

    const page = await tenantPrisma.landingPage.findFirst({
      where,
    });

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    return page;
  }

  async updateLandingPage(tenantId: string, id: string, updateLandingPageDto: UpdateLandingPageDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if page exists
    await this.getLandingPageById(tenantId, id);

    // If updating slug, check if new slug is unique
    if (updateLandingPageDto.slug) {
      const existingPage = await tenantPrisma.landingPage.findFirst({
        where: {
          tenantId,
          slug: updateLandingPageDto.slug,
          NOT: { id },
        },
      });

      if (existingPage) {
        throw new BadRequestException('Landing page with this slug already exists');
      }
    }

    return tenantPrisma.landingPage.update({
      where: { id },
      data: updateLandingPageDto,
    });
  }

  async publishLandingPage(tenantId: string, id: string, publish: boolean) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if page exists
    await this.getLandingPageById(tenantId, id);

    return tenantPrisma.landingPage.update({
      where: { id },
      data: {
        status: publish ? ContentStatus.Published : ContentStatus.Unpublished,
        publishedAt: publish ? new Date() : null,
      },
    });
  }

  async deleteLandingPage(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if page exists
    await this.getLandingPageById(tenantId, id);

    await tenantPrisma.landingPage.delete({
      where: { id },
    });

    return { message: 'Landing page deleted successfully' };
  }
}
