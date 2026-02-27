import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class FaqsService {
  constructor(private tenantService: TenantService) {}

  async createFaq(tenantId: string, createFaqDto: CreateFaqDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    return tenantPrisma.fAQ.create({
      data: {
        ...createFaqDto,
        tenantId,
        sortOrder: createFaqDto.sortOrder ?? 0,
        isActive: createFaqDto.isActive ?? true,
      },
    });
  }

  async getAllFaqs(tenantId: string, paginationDto: PaginationDto, category?: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'sortOrder', sortOrder = 'asc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(category && { category }),
      ...(search && {
        OR: [
          { question: { contains: search, mode: 'insensitive' as any } },
          { answer: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [faqs, total] = await Promise.all([
      tenantPrisma.fAQ.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      tenantPrisma.fAQ.count({ where }),
    ]);

    return {
      data: faqs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFaqById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const faq = await tenantPrisma.fAQ.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }

    return faq;
  }

  async updateFaq(tenantId: string, id: string, updateFaqDto: UpdateFaqDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if FAQ exists
    await this.getFaqById(tenantId, id);

    return tenantPrisma.fAQ.update({
      where: { id },
      data: updateFaqDto,
    });
  }

  async reorderFaq(tenantId: string, id: string, newSortOrder: number) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if FAQ exists
    await this.getFaqById(tenantId, id);

    return tenantPrisma.fAQ.update({
      where: { id },
      data: { sortOrder: newSortOrder },
    });
  }

  async deleteFaq(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if FAQ exists
    await this.getFaqById(tenantId, id);

    await tenantPrisma.fAQ.delete({
      where: { id },
    });

    return { message: 'FAQ deleted successfully' };
  }

  async getFaqsByCategory(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const faqs = await tenantPrisma.fAQ.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    // Group by category
    const grouped = faqs.reduce((acc, faq) => {
      const category = faq.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(faq);
      return acc;
    }, {} as Record<string, any[]>);

    return grouped;
  }
}
