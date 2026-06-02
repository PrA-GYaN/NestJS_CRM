import { Injectable, BadRequestException as NestBadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantService } from '../../common/tenant/tenant.service';
import { CreateWorkflowDto, UpdateWorkflowDto, CreateWorkflowStepDto, UpdateWorkflowStepDto } from './dto';
import { PaginationDto } from '../../common/dto/common.dto';
import {
  WorkflowNotFoundException,
  WorkflowStepNotFoundException,
  WorkflowStepOrderConflictException,
  VisaTypeNotFoundException,
  WorkflowValidationException,
} from './exceptions';

@Injectable()
export class WorkflowsService {
  constructor(private tenantService: TenantService) {}

  // ============ Private Helpers ============

  /**
   * Returns the existing Draft version for a workflow, or creates one.
   * When creating: copies steps from the latest existing version (if any).
   */
  private async getOrCreateDraftVersion(
    tenantPrisma: any,
    tenantId: string,
    workflowId: string,
  ) {
    const existingDraft = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { workflowId, tenantId, status: 'Draft' },
      orderBy: { versionNumber: 'desc' },
    });

    if (existingDraft) return existingDraft;

    const latestVersion = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { workflowId, tenantId },
      orderBy: { versionNumber: 'desc' },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    return tenantPrisma.visaWorkflowVersion.create({
      data: {
        tenantId,
        workflowId,
        versionNumber: nextVersionNumber,
        status: 'Draft',
        description: latestVersion
          ? `Draft based on v${latestVersion.versionNumber}`
          : 'Initial draft',
        steps: latestVersion?.steps?.length
          ? {
              createMany: {
                data: latestVersion.steps.map((s: any) => ({
                  tenantId,
                  name: s.name,
                  description: s.description,
                  stepOrder: s.stepOrder,
                  requiresDocument: s.requiresDocument,
                  isActive: s.isActive,
                  expectedDurationDays: s.expectedDurationDays,
                })),
              },
            }
          : undefined,
      },
    });
  }

  /**
   * Returns steps from the workflow's current active version, falling back to
   * the latest version by version number if no version is currently active.
   */
  private async getLatestVersionSteps(
    tenantPrisma: any,
    tenantId: string,
    workflowId: string,
  ) {
    const workflow = await tenantPrisma.visaWorkflow.findFirst({
      where: { id: workflowId, tenantId },
      include: {
        currentVersion: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
      },
    });

    if (workflow?.currentVersion?.steps) {
      return workflow.currentVersion.steps;
    }

    const latestVersion = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { workflowId, tenantId },
      orderBy: { versionNumber: 'desc' },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    return latestVersion?.steps ?? [];
  }

  // ============ Workflow Management ============

  async createWorkflow(tenantId: string, createWorkflowDto: CreateWorkflowDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const visaType = await tenantPrisma.visaType.findFirst({
      where: { id: createWorkflowDto.visaTypeId, tenantId },
    });

    if (!visaType) {
      throw new VisaTypeNotFoundException(createWorkflowDto.visaTypeId, { tenantId });
    }

    const workflow = await tenantPrisma.visaWorkflow.create({
      data: {
        ...createWorkflowDto,
        tenantId,
        versions: {
          create: {
            tenantId,
            versionNumber: 1,
            status: 'Draft',
            description: 'Initial draft',
          },
        },
      },
      include: {
        visaType: { include: { country: true } },
        versions: { orderBy: { versionNumber: 'asc' }, take: 1 },
      },
    });

    return { ...workflow, steps: [] };
  }

  async getAllWorkflows(tenantId: string, paginationDto: PaginationDto & { isActive?: boolean }) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc', search, isActive } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
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
          visaType: { include: { country: true } },
          currentVersion: {
            include: {
              _count: { select: { steps: true } },
            },
          },
          _count: { select: { versions: true } },
        },
      }),
      tenantPrisma.visaWorkflow.count({ where }),
    ]);

    return {
      data: workflows.map((w) => ({
        ...w,
        _count: {
          steps: w.currentVersion?._count?.steps ?? 0,
          versions: w._count.versions,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWorkflowsByVisaType(tenantId: string, visaTypeId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const visaType = await tenantPrisma.visaType.findFirst({
      where: { id: visaTypeId, tenantId },
    });

    if (!visaType) {
      throw new VisaTypeNotFoundException(visaTypeId, { tenantId });
    }

    const workflows = await tenantPrisma.visaWorkflow.findMany({
      where: { tenantId, visaTypeId },
      include: {
        currentVersion: {
          include: {
            steps: {
              where: { isActive: true },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return workflows.map((w) => ({
      ...w,
      steps: w.currentVersion?.steps ?? [],
    }));
  }

  async getWorkflowById(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const workflow = await tenantPrisma.visaWorkflow.findFirst({
      where: { id, tenantId },
      include: {
        visaType: { include: { country: true } },
        currentVersion: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
      },
    });

    if (!workflow) {
      throw new WorkflowNotFoundException(id, { tenantId });
    }

    const steps = workflow.currentVersion?.steps ?? workflow.versions[0]?.steps ?? [];

    return { ...workflow, steps };
  }

  async updateWorkflow(tenantId: string, id: string, updateWorkflowDto: UpdateWorkflowDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    await this.getWorkflowById(tenantId, id);

    if (updateWorkflowDto.visaTypeId) {
      const visaType = await tenantPrisma.visaType.findFirst({
        where: { id: updateWorkflowDto.visaTypeId, tenantId },
      });

      if (!visaType) {
        throw new VisaTypeNotFoundException(updateWorkflowDto.visaTypeId, {
          tenantId,
          operation: 'update_workflow',
        });
      }
    }

    const updated = await tenantPrisma.visaWorkflow.update({
      where: { id },
      data: updateWorkflowDto,
      include: {
        visaType: { include: { country: true } },
        currentVersion: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
      },
    });

    return { ...updated, steps: updated.currentVersion?.steps ?? [] };
  }

  async deleteWorkflow(tenantId: string, id: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getWorkflowById(tenantId, id);
    return tenantPrisma.visaWorkflow.delete({ where: { id } });
  }

  // ============ Workflow Step Management (version-aware) ============

  async addWorkflowStep(tenantId: string, workflowId: string, createStepDto: CreateWorkflowStepDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    await this.getWorkflowById(tenantId, workflowId);

    const draft = await this.getOrCreateDraftVersion(tenantPrisma, tenantId, workflowId);

    const existing = await tenantPrisma.visaWorkflowVersionStep.findFirst({
      where: { versionId: draft.id, stepOrder: createStepDto.stepOrder },
    });

    if (existing) {
      throw new WorkflowStepOrderConflictException(createStepDto.stepOrder, workflowId, { tenantId });
    }

    return tenantPrisma.visaWorkflowVersionStep.create({
      data: {
        ...createStepDto,
        versionId: draft.id,
        tenantId,
      },
    });
  }

  async getWorkflowSteps(tenantId: string, workflowId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    await this.getWorkflowById(tenantId, workflowId);
    return this.getLatestVersionSteps(tenantPrisma, tenantId, workflowId);
  }

  async getWorkflowStepById(tenantId: string, workflowId: string, stepId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const step = await tenantPrisma.visaWorkflowVersionStep.findFirst({
      where: {
        id: stepId,
        tenantId,
        version: { workflowId },
      },
    });

    if (!step) {
      throw new WorkflowStepNotFoundException(stepId, workflowId, { tenantId });
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

    await this.getWorkflowById(tenantId, workflowId);

    const step = await tenantPrisma.visaWorkflowVersionStep.findFirst({
      where: { id: stepId, tenantId, version: { workflowId } },
      include: { version: true },
    });

    if (!step) {
      throw new WorkflowStepNotFoundException(stepId, workflowId, { tenantId });
    }

    // If the step lives in a non-Draft version, copy it into a new draft first
    let targetVersionId = step.versionId;
    if (step.version.status !== 'Draft') {
      const draft = await this.getOrCreateDraftVersion(tenantPrisma, tenantId, workflowId);
      targetVersionId = draft.id;

      // Find the equivalent step in the new draft (same stepOrder)
      const draftStep = await tenantPrisma.visaWorkflowVersionStep.findFirst({
        where: { versionId: targetVersionId, stepOrder: step.stepOrder },
      });

      if (!draftStep) {
        throw new WorkflowStepNotFoundException(stepId, workflowId, { tenantId });
      }

      return tenantPrisma.visaWorkflowVersionStep.update({
        where: { id: draftStep.id },
        data: updateStepDto,
      });
    }

    if (updateStepDto.stepOrder !== undefined) {
      const conflict = await tenantPrisma.visaWorkflowVersionStep.findFirst({
        where: {
          versionId: targetVersionId,
          stepOrder: updateStepDto.stepOrder,
          NOT: { id: stepId },
        },
      });

      if (conflict) {
        throw new WorkflowStepOrderConflictException(updateStepDto.stepOrder, workflowId, {
          tenantId,
          operation: 'update_step',
        });
      }
    }

    return tenantPrisma.visaWorkflowVersionStep.update({
      where: { id: stepId },
      data: updateStepDto,
    });
  }

  async deleteWorkflowStep(tenantId: string, workflowId: string, stepId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    await this.getWorkflowById(tenantId, workflowId);

    const step = await tenantPrisma.visaWorkflowVersionStep.findFirst({
      where: { id: stepId, tenantId, version: { workflowId } },
      include: { version: true },
    });

    if (!step) {
      throw new WorkflowStepNotFoundException(stepId, workflowId, { tenantId });
    }

    // Only allow deletion from a Draft version
    if (step.version.status !== 'Draft') {
      // Create a draft and delete from there instead
      const draft = await this.getOrCreateDraftVersion(tenantPrisma, tenantId, workflowId);
      const draftStep = await tenantPrisma.visaWorkflowVersionStep.findFirst({
        where: { versionId: draft.id, stepOrder: step.stepOrder },
      });

      if (draftStep) {
        return tenantPrisma.visaWorkflowVersionStep.delete({ where: { id: draftStep.id } });
      }
      // Step doesn't exist in the draft — nothing to delete
      return null;
    }

    return tenantPrisma.visaWorkflowVersionStep.delete({ where: { id: stepId } });
  }

  async reorderWorkflowSteps(
    tenantId: string,
    workflowId: string,
    stepOrders: { id: string; order: number }[],
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    await this.getWorkflowById(tenantId, workflowId);

    const uniqueStepIds = new Set(stepOrders.map((so) => so.id));
    if (uniqueStepIds.size !== stepOrders.length) {
      throw new WorkflowValidationException(
        'Duplicate step IDs provided in the request',
        { tenantId, workflowId },
        { stepIds: ['Duplicate IDs detected'] },
        ['Ensure each step ID appears only once'],
      );
    }

    // Verify all provided step IDs belong to any version of this workflow
    const steps = await tenantPrisma.visaWorkflowVersionStep.findMany({
      where: { tenantId, version: { workflowId } },
      select: { id: true },
    });

    const validIds = new Set(steps.map((s) => s.id));
    const invalid = stepOrders.filter((so) => !validIds.has(so.id));

    if (invalid.length > 0) {
      throw new WorkflowValidationException(
        'Some steps do not belong to this workflow',
        { tenantId, workflowId, invalidStepIds: invalid.map((s) => s.id) },
        { steps: ['Invalid step IDs found'] },
        [`Invalid IDs: ${invalid.map((s) => s.id).join(', ')}`],
      );
    }

    // Batch update: single raw query instead of N individual updates
    await tenantPrisma.$executeRaw`
      UPDATE visa_workflow_version_steps
      SET step_order = CASE id
        ${Prisma.join(
          stepOrders.map(
            (so) => Prisma.sql`WHEN ${so.id}::uuid THEN ${so.order}`,
          ),
        )}
        ELSE step_order
      END
      WHERE id IN (${Prisma.join(stepOrders.map((so) => Prisma.sql`${so.id}::uuid`))})
    `;

    return this.getWorkflowSteps(tenantId, workflowId);
  }
}
