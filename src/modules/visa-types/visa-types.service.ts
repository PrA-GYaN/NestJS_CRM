import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateVisaTypeDto, UpdateVisaTypeDto } from './dto';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class VisaTypesService {
  constructor(private tenantService: TenantService) {}

  async createVisaType(tenantId: string, createVisaTypeDto: CreateVisaTypeDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify country exists and belongs to tenant
    const country = await tenantPrisma.country.findFirst({
      where: { id: createVisaTypeDto.countryId, tenantId },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    // Check if visa type with same name already exists for this country
    const existing = await tenantPrisma.visaType.findFirst({
      where: {
        tenantId,
        countryId: createVisaTypeDto.countryId,
        name: createVisaTypeDto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Visa type with this name already exists for this country');
    }

    return tenantPrisma.visaType.create({
      data: {
        ...createVisaTypeDto,
        tenantId,
      },
      include: {
        country: true,
        _count: {
          select: {
            workflows: true,
            applications: true,
          },
        },
      },
    });
  }

  async getAllVisaTypes(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { description: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [visaTypes, total] = await Promise.all([
      tenantPrisma.visaType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          country: true,
          _count: {
            select: {
              workflows: true,
              applications: true,
            },
          },
        },
      }),
      tenantPrisma.visaType.count({ where }),
    ]);

    return {
      data: visaTypes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVisaTypesByCountry(tenantId: string, countryId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify country exists and belongs to tenant
    const country = await tenantPrisma.country.findFirst({
      where: { id: countryId, tenantId },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return tenantPrisma.visaType.findMany({
      where: {
        tenantId,
        countryId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            workflows: true,
            applications: true,
          },
        },
      },
    });
  }

  async getVisaTypeById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const visaType = await tenantPrisma.visaType.findFirst({
      where: { id, tenantId },
      include: {
        country: true,
        workflows: {
          where: { isActive: true },
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!visaType) {
      throw new NotFoundException('Visa type not found');
    }

    return visaType;
  }

  async updateVisaType(tenantId: string, id: string, updateVisaTypeDto: UpdateVisaTypeDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify visa type exists and belongs to tenant
    await this.getVisaTypeById(tenantId, id);

    // If updating country, verify new country exists
    if (updateVisaTypeDto.countryId) {
      const country = await tenantPrisma.country.findFirst({
        where: { id: updateVisaTypeDto.countryId, tenantId },
      });

      if (!country) {
        throw new NotFoundException('Country not found');
      }
    }

    // If updating name, check for conflicts
    if (updateVisaTypeDto.name) {
      const existing = await tenantPrisma.visaType.findFirst({
        where: {
          tenantId,
          name: updateVisaTypeDto.name,
          countryId: updateVisaTypeDto.countryId,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Visa type with this name already exists for this country');
      }
    }

    return tenantPrisma.visaType.update({
      where: { id },
      data: updateVisaTypeDto,
      include: {
        country: true,
        _count: {
          select: {
            workflows: true,
            applications: true,
          },
        },
      },
    });
  }

  async deleteVisaType(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify visa type exists and belongs to tenant
    const visaType = await this.getVisaTypeById(tenantId, id);

    // Check if visa type has associated applications
    if (visaType._count.applications > 0) {
      throw new ConflictException(
        'Cannot delete visa type with existing applications. Please archive it instead.',
      );
    }

    return tenantPrisma.visaType.delete({
      where: { id },
    });
  }
}
