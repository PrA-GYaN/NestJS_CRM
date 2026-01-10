import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateLeadDto, UpdateLeadDto, ConvertLeadDto } from './dto/leads.dto';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class LeadsService {
  constructor(
    private tenantService: TenantService,
  ) {}

  async createLead(tenantId: string, createLeadDto: CreateLeadDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    return tenantPrisma.lead.create({
      data: {
        ...createLeadDto,
        tenantId,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getAllLeads(tenantId: string, paginationDto: PaginationDto) {
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

    const [leads, total] = await Promise.all([
      tenantPrisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      tenantPrisma.lead.count({ where }),
    ]);

    return {
      data: leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLeadById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const lead = await tenantPrisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async updateLead(tenantId: string, id: string, updateLeadDto: UpdateLeadDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getLeadById(tenantId, id);

    return tenantPrisma.lead.update({
      where: { id },
      data: updateLeadDto,
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteLead(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getLeadById(tenantId, id);

    await tenantPrisma.lead.delete({
      where: { id },
    });

    return { success: true, message: 'Lead deleted successfully' };
  }

  async convertToStudent(tenantId: string, id: string, convertDto: ConvertLeadDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const lead = await this.getLeadById(tenantId, id);

    if (lead.status === 'Converted') {
      throw new BadRequestException('Lead already converted');
    }

    // Start transaction
    const result = await tenantPrisma.$transaction(async (tx: any) => {
      // Create student
      const student = await tx.student.create({
        data: {
          tenantId,
          leadId: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          academicRecords: convertDto.academicRecords || {},
          testScores: convertDto.testScores || {},
          status: 'Prospective',
          priority: lead.priority,
        },
      });

      // Update lead status
      await tx.lead.update({
        where: { id: lead.id },
        data: { status: 'Converted' },
      });

      return student;
    });

    return result;
  }
}
