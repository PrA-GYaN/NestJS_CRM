import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateLeadDto, UpdateLeadDto, ConvertLeadDto, LeadsQueryDto } from './dto/leads.dto';

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

  async getAllLeads(tenantId: string, queryDto: LeadsQueryDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, status, priority, assignedUserId, source } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
    };

    // Apply filters
    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }

    if (source) {
      where.source = { contains: source, mode: 'insensitive' as any };
    }

    // Apply search
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' as any } },
        { lastName: { contains: search, mode: 'insensitive' as any } },
        { email: { contains: search, mode: 'insensitive' as any } },
      ];
    }

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

    if (lead.status !== 'Qualified') {
      throw new BadRequestException('Only qualified leads can be converted to students');
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
