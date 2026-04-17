import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import {
  CreateWorkflowVersionDto,
  ActivateWorkflowVersionDto,
  DeprecateWorkflowVersionDto,
  DefineStepMappingDto,
  MergeWorkflowVersionsDto,
  CreateVersionFromCurrentDto,
  WorkflowVersionStatus,
} from './dto';
import { PaginationDto } from '../../common/dto/common.dto';

@Injectable()
export class WorkflowVersioningService {
  constructor(private tenantService: TenantService) {}

  /**
   * Create a new workflow version from scratch
   */
  async createWorkflowVersion(tenantId: string, createDto: CreateWorkflowVersionDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify workflow exists
    const workflow = await tenantPrisma.visaWorkflow.findFirst({
      where: { id: createDto.workflowId, tenantId },
    });

    if (!workflow) {
      throw new NotFoundException('Visa workflow not found');
    }

    // Get next version number
    const lastVersion = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { workflowId: createDto.workflowId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Validate steps
    if (!createDto.steps || createDto.steps.length === 0) {
      throw new BadRequestException('At least one workflow step is required');
    }

    // Sort steps by stepOrder
    const sortedSteps = [...createDto.steps].sort((a, b) => a.stepOrder - b.stepOrder);

    // Validate step orders are sequential
    for (let i = 0; i < sortedSteps.length; i++) {
      if (sortedSteps[i].stepOrder !== i + 1) {
        throw new BadRequestException('Step orders must be sequential starting from 1');
      }
    }

    // Create version with steps
    const version = await tenantPrisma.visaWorkflowVersion.create({
      data: {
        tenantId,
        workflowId: createDto.workflowId,
        versionNumber: nextVersionNumber,
        status: WorkflowVersionStatus.Draft,
        description: createDto.description,
        steps: {
          createMany: {
            data: sortedSteps.map((step) => ({
              tenantId,
              name: step.name,
              description: step.description,
              stepOrder: step.stepOrder,
              requiresDocument: step.requiresDocument ?? false,
              isActive: step.isActive ?? true,
              expectedDurationDays: step.expectedDurationDays,
            })),
          },
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    // Add to history
    await tenantPrisma.workflowVersionHistory.create({
      data: {
        tenantId,
        versionId: version.id,
        changeType: 'created',
        changeDetails: {
          versionNumber: version.versionNumber,
          stepsCount: sortedSteps.length,
        },
      },
    });

    return this.formatVersionResponse(version);
  }

  /**
   * Create a new version from current workflow structure (legacy VisaWorkflowStep)
   */
  async createVersionFromCurrent(tenantId: string, createDto: CreateVersionFromCurrentDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify workflow exists
    const workflow = await tenantPrisma.visaWorkflow.findFirst({
      where: { id: createDto.workflowId, tenantId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!workflow) {
      throw new NotFoundException('Visa workflow not found');
    }

    // Get next version number
    const lastVersion = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { workflowId: createDto.workflowId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Create version from existing steps
    const version = await tenantPrisma.visaWorkflowVersion.create({
      data: {
        tenantId,
        workflowId: createDto.workflowId,
        versionNumber: nextVersionNumber,
        status: WorkflowVersionStatus.Draft,
        description: createDto.description,
        steps: {
          createMany: {
            data: workflow.steps.map((step) => ({
              tenantId,
              name: step.name,
              description: step.description,
              stepOrder: step.stepOrder,
              requiresDocument: step.requiresDocument,
              isActive: step.isActive,
              expectedDurationDays: step.expectedDurationDays,
            })),
          },
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    // Add to history
    await tenantPrisma.workflowVersionHistory.create({
      data: {
        tenantId,
        versionId: version.id,
        changeType: 'created',
        changeDetails: {
          versionNumber: version.versionNumber,
          stepsCount: workflow.steps.length,
          source: 'legacy_workflow_steps',
        },
      },
    });

    return this.formatVersionResponse(version);
  }

  /**
   * Get all versions of a workflow
   */
  async getWorkflowVersions(tenantId: string, workflowId: string, paginationDto: PaginationDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);
    const { page = 1, limit = 20, sortBy = 'versionNumber', sortOrder = 'desc' } = paginationDto;
    const skip = (page - 1) * limit;

    // Verify workflow exists
    const workflow = await tenantPrisma.visaWorkflow.findFirst({
      where: { id: workflowId, tenantId },
    });

    if (!workflow) {
      throw new NotFoundException('Visa workflow not found');
    }

    const [versions, total] = await Promise.all([
      tenantPrisma.visaWorkflowVersion.findMany({
        where: { workflowId, tenantId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
      tenantPrisma.visaWorkflowVersion.count({
        where: { workflowId, tenantId },
      }),
    ]);

    return {
      data: versions.map((v) => this.formatVersionResponse(v, v._count?.applications || 0)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a specific workflow version
   */
  async getWorkflowVersion(tenantId: string, versionId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const version = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { id: versionId, tenantId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Workflow version not found');
    }

    return this.formatVersionResponse(version, version._count?.applications || 0);
  }

  /**
   * Activate a workflow version (set as current)
   */
  async activateWorkflowVersion(tenantId: string, activateDto: ActivateWorkflowVersionDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const version = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { id: activateDto.versionId, tenantId },
    });

    if (!version) {
      throw new NotFoundException('Workflow version not found');
    }

    if (version.status === WorkflowVersionStatus.Deprecated) {
      throw new BadRequestException('Cannot activate a deprecated version');
    }

    if (version.status === WorkflowVersionStatus.Archived) {
      throw new BadRequestException('Cannot activate an archived version');
    }

    // Update workflow's current version
    const updatedWorkflow = await tenantPrisma.visaWorkflow.update({
      where: { id: version.workflowId },
      data: {
        currentVersionId: activateDto.versionId,
      },
    });

    // Update version status to Active
    const updatedVersion = await tenantPrisma.visaWorkflowVersion.update({
      where: { id: activateDto.versionId },
      data: {
        status: WorkflowVersionStatus.Active,
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    // Add to history
    await tenantPrisma.workflowVersionHistory.create({
      data: {
        tenantId,
        versionId: updatedVersion.id,
        changeType: 'updated',
        changeDetails: {
          action: 'activated',
          previousStatus: version.status,
          newStatus: WorkflowVersionStatus.Active,
        },
      },
    });

    return this.formatVersionResponse(updatedVersion, updatedVersion._count?.applications || 0);
  }

  /**
   * Deprecate a workflow version
   */
  async deprecateWorkflowVersion(tenantId: string, deprecateDto: DeprecateWorkflowVersionDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const version = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { id: deprecateDto.versionId, tenantId },
    });

    if (!version) {
      throw new NotFoundException('Workflow version not found');
    }

    if (version.status === WorkflowVersionStatus.Deprecated) {
      throw new BadRequestException('Version is already deprecated');
    }

    // Update version
    const updatedVersion = await tenantPrisma.visaWorkflowVersion.update({
      where: { id: deprecateDto.versionId },
      data: {
        status: WorkflowVersionStatus.Deprecated,
        deprecatedAt: new Date(),
        deprecatedReason: deprecateDto.deprecatedReason,
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    // Add to history
    await tenantPrisma.workflowVersionHistory.create({
      data: {
        tenantId,
        versionId: updatedVersion.id,
        changeType: 'deprecated',
        changeDetails: {
          reason: deprecateDto.deprecatedReason,
          deprecatedAt: new Date().toISOString(),
        },
      },
    });

    return this.formatVersionResponse(updatedVersion, updatedVersion._count?.applications || 0);
  }

  /**
   * Delete a workflow version (only if no applications use it)
   */
  async deleteWorkflowVersion(tenantId: string, versionId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const version = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { id: versionId, tenantId },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Workflow version not found');
    }

    // Check if any applications use this version
    if ((version._count?.applications || 0) > 0) {
      throw new ConflictException(
        `Cannot delete version. ${version._count?.applications} applications are currently using it. Consider deprecating instead.`,
      );
    }

    // Delete version (cascade will delete steps and mappings)
    await tenantPrisma.visaWorkflowVersion.delete({
      where: { id: versionId },
    });

    // Add to history
    await tenantPrisma.workflowVersionHistory.create({
      data: {
        tenantId,
        versionId,
        changeType: 'updated',
        changeDetails: {
          action: 'deleted',
        },
      },
    });
  }

  /**
   * Get version history/changelog
   */
  async getVersionHistory(tenantId: string, versionId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const history = await tenantPrisma.workflowVersionHistory.findMany({
      where: { versionId, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return history;
  }

  /**
   * Define step mappings between two versions
   */
  async defineStepMappings(tenantId: string, defineMappingDto: DefineStepMappingDto) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify both versions exist
    const [fromVersion, toVersion] = await Promise.all([
      tenantPrisma.visaWorkflowVersion.findFirst({
        where: { id: defineMappingDto.fromVersionId, tenantId },
        include: { steps: true },
      }),
      tenantPrisma.visaWorkflowVersion.findFirst({
        where: { id: defineMappingDto.toVersionId, tenantId },
        include: { steps: true },
      }),
    ]);

    if (!fromVersion || !toVersion) {
      throw new NotFoundException('One or both workflow versions not found');
    }

    // Create step mappings
    const mappings = await Promise.all(
      defineMappingDto.mappings.map((mapping) =>
        tenantPrisma.stepMapping.upsert({
          where: {
            fromStepId_toStepId: {
              fromStepId: mapping.fromStepId,
              toStepId: mapping.toStepId,
            },
          },
          update: {
            isCompatible: mapping.isCompatible ?? true,
            mappingReason: mapping.mappingReason,
          },
          create: {
            tenantId,
            fromStepId: mapping.fromStepId,
            toStepId: mapping.toStepId,
            isCompatible: mapping.isCompatible ?? true,
            mappingReason: mapping.mappingReason,
          },
        }),
      ),
    );

    return {
      fromVersionId: fromVersion.id,
      toVersionId: toVersion.id,
      totalMappings: mappings.length,
      mappings,
    };
  }

  /**
   * Get step mappings between two versions
   */
  async getStepMappings(tenantId: string, fromVersionId: string, toVersionId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Get versions with steps
    const [fromVersion, toVersion] = await Promise.all([
      tenantPrisma.visaWorkflowVersion.findFirst({
        where: { id: fromVersionId, tenantId },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      }),
      tenantPrisma.visaWorkflowVersion.findFirst({
        where: { id: toVersionId, tenantId },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      }),
    ]);

    if (!fromVersion || !toVersion) {
      throw new NotFoundException('One or both workflow versions not found');
    }

    // Get existing mappings
    const mappings = await tenantPrisma.stepMapping.findMany({
      where: {
        fromStep: { versionId: fromVersionId },
      },
      include: {
        fromStep: true,
        toStep: true,
      },
    });

    return {
      fromVersion: {
        id: fromVersion.id,
        versionNumber: fromVersion.versionNumber,
        steps: fromVersion.steps,
      },
      toVersion: {
        id: toVersion.id,
        versionNumber: toVersion.versionNumber,
        steps: toVersion.steps,
      },
      mappings,
    };
  }

  /**
   * Helper: Format version response
   */
  private formatVersionResponse(version: any, applicationCount: number = 0) {
    return {
      id: version.id,
      workflowId: version.workflowId,
      versionNumber: version.versionNumber,
      status: version.status,
      description: version.description,
      steps: version.steps || [],
      applicationCount,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
      deprecatedAt: version.deprecatedAt,
      deprecatedReason: version.deprecatedReason,
    };
  }
}
