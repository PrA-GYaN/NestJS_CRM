import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateBlogDto, UpdateBlogDto, ContentStatus } from './dto/blog.dto';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class BlogsService {
  constructor(private tenantService: TenantService) {}

  async createBlog(tenantId: string, createBlogDto: CreateBlogDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if slug already exists for this tenant
    const existingBlog = await tenantPrisma.blogPost.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug: createBlogDto.slug,
        },
      },
    });

    if (existingBlog) {
      throw new BadRequestException('Blog with this slug already exists');
    }

    return tenantPrisma.blogPost.create({
      data: {
        ...createBlogDto,
        tenantId,
        tags: createBlogDto.tags || [],
        status: ContentStatus.Draft,
      },
    });
  }

  async getAllBlogs(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as any } },
          { excerpt: { contains: search, mode: 'insensitive' as any } },
          { author: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [blogs, total] = await Promise.all([
      tenantPrisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      tenantPrisma.blogPost.count({ where }),
    ]);

    return {
      data: blogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBlogById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const blog = await tenantPrisma.blogPost.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    return blog;
  }

  async getBlogBySlug(tenantId: string, slug: string, publicAccess = false) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const where: any = {
      tenantId,
      slug,
    };

    // For public access, only return published blogs
    if (publicAccess) {
      where.status = ContentStatus.Published;
      where.publishedAt = {
        lte: new Date(),
      };
    }

    const blog = await tenantPrisma.blogPost.findFirst({
      where,
    });

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    return blog;
  }

  async updateBlog(tenantId: string, id: string, updateBlogDto: UpdateBlogDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if blog exists
    await this.getBlogById(tenantId, id);

    // If updating slug, check if new slug is unique
    if (updateBlogDto.slug) {
      const existingBlog = await tenantPrisma.blogPost.findFirst({
        where: {
          tenantId,
          slug: updateBlogDto.slug,
          NOT: { id },
        },
      });

      if (existingBlog) {
        throw new BadRequestException('Blog with this slug already exists');
      }
    }

    return tenantPrisma.blogPost.update({
      where: { id },
      data: {
        ...updateBlogDto,
        ...(updateBlogDto.tags && { tags: updateBlogDto.tags }),
      },
    });
  }

  async publishBlog(tenantId: string, id: string, publish: boolean) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if blog exists
    await this.getBlogById(tenantId, id);

    return tenantPrisma.blogPost.update({
      where: { id },
      data: {
        status: publish ? ContentStatus.Published : ContentStatus.Unpublished,
        publishedAt: publish ? new Date() : null,
      },
    });
  }

  async deleteBlog(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if blog exists
    await this.getBlogById(tenantId, id);

    await tenantPrisma.blogPost.delete({
      where: { id },
    });

    return { message: 'Blog post deleted successfully' };
  }
}
