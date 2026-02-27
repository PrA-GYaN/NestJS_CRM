import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateCountryDto, UpdateCountryDto } from './dto';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class CountriesService {
  constructor(private tenantService: TenantService) {}

  async createCountry(tenantId: string, createCountryDto: CreateCountryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if country code already exists for this tenant
    const existing = await tenantPrisma.country.findFirst({
      where: {
        tenantId,
        code: createCountryDto.code.toUpperCase(),
      },
    });

    if (existing) {
      throw new ConflictException('Country with this code already exists');
    }

    return tenantPrisma.country.create({
      data: {
        ...createCountryDto,
        code: createCountryDto.code.toUpperCase(),
        tenantId,
      },
    });
  }

  async getAllCountries(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 100, sortBy = 'name', sortOrder = 'asc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { code: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [countries, total] = await Promise.all([
      tenantPrisma.country.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              universities: true,
              visaTypes: true,
            },
          },
        },
      }),
      tenantPrisma.country.count({ where }),
    ]);

    return {
      data: countries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getActiveCountries(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    return tenantPrisma.country.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCountryById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const country = await tenantPrisma.country.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            universities: true,
            visaTypes: true,
          },
        },
      },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async updateCountry(tenantId: string, id: string, updateCountryDto: UpdateCountryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify country exists and belongs to tenant
    await this.getCountryById(tenantId, id);

    // If updating code, check for conflicts
    if (updateCountryDto.code) {
      const existing = await tenantPrisma.country.findFirst({
        where: {
          tenantId,
          code: updateCountryDto.code.toUpperCase(),
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Country with this code already exists');
      }

      updateCountryDto.code = updateCountryDto.code.toUpperCase();
    }

    return tenantPrisma.country.update({
      where: { id },
      data: updateCountryDto,
    });
  }

  async deleteCountry(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify country exists and belongs to tenant
    await this.getCountryById(tenantId, id);

    // Check if country has associated data
    const country = await tenantPrisma.country.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            universities: true,
            visaTypes: true,
          },
        },
      },
    });

    if (!country) {
      throw new NotFoundException(`Country with ID ${id} not found`);
    }

    if (country._count.universities > 0 || country._count.visaTypes > 0) {
      throw new ConflictException(
        'Cannot delete country with associated universities or visa types. Please remove them first.',
      );
    }

    return tenantPrisma.country.delete({
      where: { id },
    });
  }

  async getCountryUniversities(tenantId: string, countryId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    
    // Verify country exists and belongs to tenant
    await this.getCountryById(tenantId, countryId);

    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      countryId,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as any },
      }),
    };

    const [universities, total] = await Promise.all([
      tenantPrisma.university.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
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

  async getCountryVisaTypes(tenantId: string, countryId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    
    // Verify country exists and belongs to tenant
    await this.getCountryById(tenantId, countryId);

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
}
