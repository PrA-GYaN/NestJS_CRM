import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateWorkflowDto, UpdateWorkflowDto, CreateWorkflowStepDto, UpdateWorkflowStepDto } from './dto';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class WorkflowsService {
  constructor(private tenantService: TenantService) {}

  // ============ Workflow Management ============

  async createWorkflow(tenantId: string, createWorkflowDto: CreateWorkflowDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify visa type exists and belongs to tenant
    const visaType = await tenantPrisma.visaType.findFirst({
      where: { id: createWorkflowDto.visaTypeId, tenantId },
    });

    if (!visaType) {
      throw new NotFoundException('Visa type not found');
    }

    return tenantPrisma.visaWorkflow.create({
      data: {
        ...createWorkflowDto,
        tenantId,
      },
      include: {
        visaType: {
          include: {
            country: true,
          },
        },
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
  }

  async getAllWorkflows(tenantId: string, paginationDto: PaginationDto) {
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

    const [workflows, total] = await Promise.all([
      tenantPrisma.visaWorkflow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          visaType: {
            include: {
              country: true,
            },
          },
          _count: {
            select: {
              steps: true,
            },
          },
        },
      }),
      tenantPrisma.visaWorkflow.count({ where }),
    ]);

    return {
      data: workflows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWorkflowsByVisaType(tenantId: string, visaTypeId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify visa type exists and belongs to tenant
    const visaType = await tenantPrisma.visaType.findFirst({
      where: { id: visaTypeId, tenantId },
    });

    if (!visaType) {
      throw new NotFoundException('Visa type not found');
    }

    return tenantPrisma.visaWorkflow.findMany({
      where: {
        tenantId,
        visaTypeId,
      },
      include: {
        steps: {
          where: { isActive: true },
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getWorkflowById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const workflow = await tenantPrisma.visaWorkflow.findFirst({
      where: { id, tenantId },
      include: {
        visaType: {
          include: {
            country: true,
          },
        },
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async updateWorkflow(tenantId: string, id: string, updateWorkflowDto: UpdateWorkflowDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify workflow exists and belongs to tenant
    await this.getWorkflowById(tenantId, id);

    // If updating visa type, verify it exists
    if (updateWorkflowDto.visaTypeId) {
      const visaType = await tenantPrisma.visaType.findFirst({
        where: { id: updateWorkflowDto.visaTypeId, tenantId },
      });

      if (!visaType) {
        throw new NotFoundException('Visa type not found');
      }
    }

    return tenantPrisma.visaWorkflow.update({
      where: { id },
      data: updateWorkflowDto,
      include: {
        visaType: {
          include: {
            country: true,
          },
        },
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
  }

  async deleteWorkflow(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify workflow exists and belongs to tenant
    await this.getWorkflowById(tenantId, id);

    // Note: Steps will be cascade deleted automatically
    return tenantPrisma.visaWorkflow.delete({
      where: { id },
    });
  }

  // ============ Workflow Step Management ============

  async addWorkflowStep(tenantId: string, workflowId: string, createStepDto: CreateWorkflowStepDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify workflow exists and belongs to tenant
    await this.getWorkflowById(tenantId, workflowId);

    // Check if step order already exists
    const existing = await tenantPrisma.visaWorkflowStep.findFirst({
      where: {
        workflowId,
        stepOrder: createStepDto.stepOrder,
      },
    });

    if (existing) {
      throw new ConflictException(`Step with order ${createStepDto.stepOrder} already exists`);
    }

    return tenantPrisma.visaWorkflowStep.create({
      data: {
        ...createStepDto,
        workflowId,
        tenantId,
      },
    });
  }

  async getWorkflowSteps(tenantId: string, workflowId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify workflow exists and belongs to tenant
    await this.getWorkflowById(tenantId, workflowId);

    return tenantPrisma.visaWorkflowStep.findMany({
      where: {
        tenantId,
        workflowId,
      },
      orderBy: { stepOrder: 'asc' },
    });
  }

  async getWorkflowStepById(tenantId: string, workflowId: string, stepId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const step = await tenantPrisma.visaWorkflowStep.findFirst({
      where: {
        id: stepId,
        workflowId,
        tenantId,
      },
    });

    if (!step) {
      throw new NotFoundException('Workflow step not found');
    }

    return step;
  }

  async updateWorkflowStep(
    tenantId: string,
    workflowId: string,
    stepId: string,
    updateStepDto: UpdateWorkflowStepDto,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify step exists
    await this.getWorkflowStepById(tenantId, workflowId, stepId);

    // If updating step order, check for conflicts
    if (updateStepDto.stepOrder !== undefined) {
      const existing = await tenantPrisma.visaWorkflowStep.findFirst({
        where: {
          workflowId,
          stepOrder: updateStepDto.stepOrder,
          NOT: { id: stepId },
        },
      });

      if (existing) {
        throw new ConflictException(`Step with order ${updateStepDto.stepOrder} already exists`);
      }
    }

    return tenantPrisma.visaWorkflowStep.update({
      where: { id: stepId },
      data: updateStepDto,
    });
  }

  async deleteWorkflowStep(tenantId: string, workflowId: string, stepId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify step exists
    await this.getWorkflowStepById(tenantId, workflowId, stepId);

    return tenantPrisma.visaWorkflowStep.delete({
      where: { id: stepId },
    });
  }

  async reorderWorkflowSteps(tenantId: string, workflowId: string, stepOrders: { id: string; order: number }[]) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify workflow exists
    await this.getWorkflowById(tenantId, workflowId);

    // Verify all steps belong to this workflow
    const steps = await tenantPrisma.visaWorkflowStep.findMany({
      where: {
        workflowId,
        tenantId,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepIds = steps.map((s: any) => s.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invalidSteps = stepOrders.filter((so: any) => !stepIds.includes(so.id));

    if (invalidSteps.length > 0) {
      throw new BadRequestException('Some steps do not belong to this workflow');
    }

    // Update all step orders in a transaction
    await tenantPrisma.$transaction(
      stepOrders.map((so) =>
        tenantPrisma.visaWorkflowStep.update({
          where: { id: so.id },
          data: { stepOrder: so.order },
        }),
      ),
    );

    return this.getWorkflowSteps(tenantId, workflowId);
  }
}
