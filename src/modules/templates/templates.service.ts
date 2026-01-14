import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  TemplateStatus,
  PreviewEmailTemplateDto,
} from './dto/email-template.dto';
import {
  CreateSmsTemplateDto,
  UpdateSmsTemplateDto,
  PreviewSmsTemplateDto,
} from './dto/sms-template.dto';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class TemplatesService {
  constructor(private tenantService: TenantService) {}

  // ============================================
  // EMAIL TEMPLATE METHODS
  // ============================================

  async createEmailTemplate(tenantId: string, createDto: CreateEmailTemplateDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if template name already exists for this tenant
    const existingTemplate = await tenantPrisma.emailTemplate.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: createDto.name,
        },
      },
    });

    if (existingTemplate) {
      throw new BadRequestException('Email template with this name already exists for this tenant');
    }

    // Validate variables in template
    this.validateTemplateVariables(createDto.body, createDto.variables);
    this.validateTemplateVariables(createDto.subject, createDto.variables);

    return tenantPrisma.emailTemplate.create({
      data: {
        ...createDto,
        tenantId,
        variables: createDto.variables || [],
        status: TemplateStatus.Inactive,
      },
    });
  }

  async getAllEmailTemplates(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId, // CRITICAL: Always filter by tenantId
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { subject: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [templates, total] = await Promise.all([
      tenantPrisma.emailTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      tenantPrisma.emailTemplate.count({ where }),
    ]);

    return {
      data: templates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEmailTemplateById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const template = await tenantPrisma.emailTemplate.findFirst({
      where: {
        id,
        tenantId, // CRITICAL: Must match tenant
      },
    });

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    return template;
  }

  async updateEmailTemplate(tenantId: string, id: string, updateDto: UpdateEmailTemplateDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if template exists and belongs to tenant
    await this.getEmailTemplateById(tenantId, id);

    // If updating name, check uniqueness
    if (updateDto.name) {
      const existingTemplate = await tenantPrisma.emailTemplate.findFirst({
        where: {
          tenantId,
          name: updateDto.name,
          NOT: { id },
        },
      });

      if (existingTemplate) {
        throw new BadRequestException('Email template with this name already exists');
      }
    }

    // Validate variables if updating body or subject
    if (updateDto.body) {
      this.validateTemplateVariables(updateDto.body, updateDto.variables);
    }
    if (updateDto.subject) {
      this.validateTemplateVariables(updateDto.subject, updateDto.variables);
    }

    return tenantPrisma.emailTemplate.update({
      where: { id },
      data: {
        ...updateDto,
        ...(updateDto.variables && { variables: updateDto.variables }),
      },
    });
  }

  async activateEmailTemplate(tenantId: string, id: string, active: boolean) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if template exists and belongs to tenant
    await this.getEmailTemplateById(tenantId, id);

    return tenantPrisma.emailTemplate.update({
      where: { id },
      data: {
        status: active ? TemplateStatus.Active : TemplateStatus.Inactive,
      },
    });
  }

  async deleteEmailTemplate(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if template exists and belongs to tenant
    await this.getEmailTemplateById(tenantId, id);

    await tenantPrisma.emailTemplate.delete({
      where: { id },
    });

    return { message: 'Email template deleted successfully' };
  }

  async previewEmailTemplate(tenantId: string, id: string, previewDto: PreviewEmailTemplateDto) {
    const template = await this.getEmailTemplateById(tenantId, id);

    const previewSubject = this.substituteVariables(template.subject, previewDto.sampleData);
    const previewBody = this.substituteVariables(template.body, previewDto.sampleData);

    return {
      subject: previewSubject,
      body: previewBody,
      originalSubject: template.subject,
      originalBody: template.body,
      sampleData: previewDto.sampleData,
    };
  }

  // ============================================
  // SMS TEMPLATE METHODS
  // ============================================

  async createSmsTemplate(tenantId: string, createDto: CreateSmsTemplateDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if template name already exists for this tenant
    const existingTemplate = await tenantPrisma.sMSTemplate.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: createDto.name,
        },
      },
    });

    if (existingTemplate) {
      throw new BadRequestException('SMS template with this name already exists for this tenant');
    }

    // Validate variables in template
    this.validateTemplateVariables(createDto.body, createDto.variables);

    return tenantPrisma.sMSTemplate.create({
      data: {
        ...createDto,
        tenantId,
        variables: createDto.variables || [],
        status: TemplateStatus.Inactive,
      },
    });
  }

  async getAllSmsTemplates(tenantId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = paginationDto;
    const skip = (page - 1) * limit;

    const where = {
      tenantId, // CRITICAL: Always filter by tenantId
      ...(search && {
        name: { contains: search, mode: 'insensitive' as any },
      }),
    };

    const [templates, total] = await Promise.all([
      tenantPrisma.sMSTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      tenantPrisma.sMSTemplate.count({ where }),
    ]);

    return {
      data: templates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSmsTemplateById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const template = await tenantPrisma.sMSTemplate.findFirst({
      where: {
        id,
        tenantId, // CRITICAL: Must match tenant
      },
    });

    if (!template) {
      throw new NotFoundException('SMS template not found');
    }

    return template;
  }

  async updateSmsTemplate(tenantId: string, id: string, updateDto: UpdateSmsTemplateDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if template exists and belongs to tenant
    await this.getSmsTemplateById(tenantId, id);

    // If updating name, check uniqueness
    if (updateDto.name) {
      const existingTemplate = await tenantPrisma.sMSTemplate.findFirst({
        where: {
          tenantId,
          name: updateDto.name,
          NOT: { id },
        },
      });

      if (existingTemplate) {
        throw new BadRequestException('SMS template with this name already exists');
      }
    }

    // Validate variables if updating body
    if (updateDto.body) {
      this.validateTemplateVariables(updateDto.body, updateDto.variables);
    }

    return tenantPrisma.sMSTemplate.update({
      where: { id },
      data: {
        ...updateDto,
        ...(updateDto.variables && { variables: updateDto.variables }),
      },
    });
  }

  async activateSmsTemplate(tenantId: string, id: string, active: boolean) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if template exists and belongs to tenant
    await this.getSmsTemplateById(tenantId, id);

    return tenantPrisma.sMSTemplate.update({
      where: { id },
      data: {
        status: active ? TemplateStatus.Active : TemplateStatus.Inactive,
      },
    });
  }

  async deleteSmsTemplate(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Check if template exists and belongs to tenant
    await this.getSmsTemplateById(tenantId, id);

    await tenantPrisma.sMSTemplate.delete({
      where: { id },
    });

    return { message: 'SMS template deleted successfully' };
  }

  async previewSmsTemplate(tenantId: string, id: string, previewDto: PreviewSmsTemplateDto) {
    const template = await this.getSmsTemplateById(tenantId, id);

    const previewBody = this.substituteVariables(template.body, previewDto.sampleData);

    return {
      body: previewBody,
      originalBody: template.body,
      sampleData: previewDto.sampleData,
      characterCount: previewBody.length,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private validateTemplateVariables(content: string, declaredVariables?: string[]) {
    // Extract all variables from content ({{variableName}})
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(variableRegex);
    const usedVariables = Array.from(matches, m => m[1]);

    if (declaredVariables && declaredVariables.length > 0) {
      // Check if all used variables are declared
      const undeclaredVars = usedVariables.filter(v => !declaredVariables.includes(v));
      if (undeclaredVars.length > 0) {
        throw new BadRequestException(
          `Template uses undeclared variables: ${undeclaredVars.join(', ')}`,
        );
      }
    }

    return usedVariables;
  }

  substituteVariables(content: string, data: Record<string, any>): string {
    let result = content;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }
}
