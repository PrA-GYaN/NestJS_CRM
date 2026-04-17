import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';
import { MigrationStrategyDto } from './dto';

@Injectable()
export class WorkflowMigrationService {
  constructor(private tenantService: TenantService) {}

  /**
   * Migrate a single application to a new workflow version
   */
  async migrateApplication(
    tenantId: string,
    applicationId: string,
    toVersionId: string,
    strategy: MigrationStrategyDto,
    targetStepId?: string,
    notes?: string,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Get application
    const application = await tenantPrisma.visaApplication.findFirst({
      where: { id: applicationId, tenantId },
      include: {
        workflowVersion: {
          include: { steps: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Visa application not found');
    }

    // Get target version
    const targetVersion = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { id: toVersionId, tenantId },
      include: { steps: true },
    });

    if (!targetVersion) {
      throw new NotFoundException('Target workflow version not found');
    }

    // Can't migrate if application is completed
    if (application.status === 'Approved' || application.status === 'Rejected') {
      throw new ConflictException('Cannot migrate a completed application');
    }

    // Determine new step ID based on strategy
    let newStepId = application.currentStepId;

    if (strategy === MigrationStrategyDto.RemapStep) {
      if (!targetStepId) {
        throw new BadRequestException('Target step ID is required for RemapStep strategy');
      }

      // Verify target step exists in target version
      const targetStep = targetVersion.steps.find((s) => s.id === targetStepId);
      if (!targetStep) {
        throw new BadRequestException('Target step not found in target version');
      }

      newStepId = targetStepId;
    } else if (strategy === MigrationStrategyDto.KeepCurrentStep) {
      // Find equivalent step in target version by order
      const currentStep = application.workflowVersion.steps.find((s) => s.id === application.currentStepId);
      if (currentStep) {
        const equivalentStep = targetVersion.steps.find((s) => s.stepOrder === currentStep.stepOrder);
        newStepId = equivalentStep?.id || targetVersion.steps[0]?.id;
      } else {
        newStepId = targetVersion.steps[0]?.id || null;
      }
    } else if (strategy === MigrationStrategyDto.ForcedUpdate) {
      // Force to first step of new version
      newStepId = targetVersion.steps[0]?.id || null;
    }

    // Create migration record
    const migration = await tenantPrisma.workflowVersionMigration.create({
      data: {
        tenantId,
        workflowId: application.workflowId,
        fromVersionId: application.workflowVersionId,
        toVersionId,
        strategy: strategy,
      },
    });

    // Create application migration log
    const migrationLog = await tenantPrisma.applicationMigrationLog.create({
      data: {
        tenantId,
        applicationId,
        migrationId: migration.id,
        fromVersionId: application.workflowVersionId,
        toVersionId,
        fromStepId: application.currentStepId,
        toStepId: newStepId,
        status: 'InProgress',
      },
    });

    try {
      // Update application
      const updatedApplication = await tenantPrisma.visaApplication.update({
        where: { id: applicationId },
        data: {
          workflowVersionId: toVersionId,
          currentStepId: newStepId,
          version: { increment: 1 },
        },
        include: {
          workflowVersion: { include: { steps: true } },
        },
      });

      // Mark migration as completed
      await tenantPrisma.applicationMigrationLog.update({
        where: { id: migrationLog.id },
        data: {
          status: 'Completed',
          migratedAt: new Date(),
        },
      });

      return {
        success: true,
        applicationId,
        fromVersionId: application.workflowVersionId,
        toVersionId,
        fromStepId: application.currentStepId,
        toStepId: newStepId,
        strategy,
        migrationLog: migrationLog.id,
      };
    } catch (error) {
      // Mark migration as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      await tenantPrisma.applicationMigrationLog.update({
        where: { id: migrationLog.id },
        data: {
          status: 'Failed',
          errorMessage,
        },
      });

      throw error;
    }
  }

  /**
   * Bulk migrate applications from one version to another
   */
  async bulkMigrateApplications(
    tenantId: string,
    fromVersionId: string,
    toVersionId: string,
    strategy: MigrationStrategyDto,
    statusFilters?: string[],
    validateMappings: boolean = true,
  ) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify versions exist
    const [fromVersion, toVersion] = await Promise.all([
      tenantPrisma.visaWorkflowVersion.findFirst({
        where: { id: fromVersionId, tenantId },
        include: { steps: true },
      }),
      tenantPrisma.visaWorkflowVersion.findFirst({
        where: { id: toVersionId, tenantId },
        include: { steps: true },
      }),
    ]);

    if (!fromVersion || !toVersion) {
      throw new NotFoundException('One or both workflow versions not found');
    }

    // Validate mappings if required
    if (validateMappings && strategy === MigrationStrategyDto.KeepCurrentStep) {
      await this.validateVersionMappings(tenantId, fromVersionId, toVersionId);
    }

    // Get applications to migrate
    const whereClause: any = {
      tenantId,
      workflowVersionId: fromVersionId,
      status: { notIn: ['Approved', 'Rejected'] },
    };

    if (statusFilters && statusFilters.length > 0) {
      whereClause.status = { in: statusFilters };
    }

    const applicationsToMigrate = await tenantPrisma.visaApplication.findMany({
      where: whereClause,
      include: {
        workflowVersion: { include: { steps: true } },
      },
    });

    // Create migration record
    const migration = await tenantPrisma.workflowVersionMigration.create({
      data: {
        tenantId,
        workflowId: fromVersion.workflowId,
        fromVersionId,
        toVersionId,
        strategy,
      },
    });

    const results = {
      migrationId: migration.id,
      totalApplications: applicationsToMigrate.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      failedApplications: [] as any[],
    };

    // Process each application
    for (const app of applicationsToMigrate) {
      try {
        // Determine new step
        let newStepId = app.currentStepId;

        if (strategy === MigrationStrategyDto.KeepCurrentStep) {
          // Find equivalent step by order
          const currentStep = fromVersion.steps.find((s) => s.id === app.currentStepId);
          if (currentStep) {
            const equivalentStep = toVersion.steps.find((s) => s.stepOrder === currentStep.stepOrder);
            newStepId = equivalentStep?.id || toVersion.steps[0]?.id;
          } else {
            newStepId = toVersion.steps[0]?.id;
          }
        } else if (strategy === MigrationStrategyDto.ForcedUpdate) {
          newStepId = toVersion.steps[0]?.id;
        }

        // Create migration log
        const migrationLog = await tenantPrisma.applicationMigrationLog.create({
          data: {
            tenantId,
            applicationId: app.id,
            migrationId: migration.id,
            fromVersionId,
            toVersionId,
            fromStepId: app.currentStepId,
            toStepId: newStepId,
            status: 'InProgress',
          },
        });

        // Update application
        await tenantPrisma.visaApplication.update({
          where: { id: app.id },
          data: {
            workflowVersionId: toVersionId,
            currentStepId: newStepId,
            version: { increment: 1 },
          },
        });

        // Mark migration log as completed
        await tenantPrisma.applicationMigrationLog.update({
          where: { id: migrationLog.id },
          data: {
            status: 'Completed',
            migratedAt: new Date(),
          },
        });

        results.successful++;
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.failedApplications.push({
          applicationId: app.id,
          error: errorMessage,
        });
      }
    }

    // Mark migration as applied
    await tenantPrisma.workflowVersionMigration.update({
      where: { id: migration.id },
      data: {
        appliedAt: new Date(),
      },
    });

    return results;
  }

  /**
   * Force migrate all applications to a newer version
   */
  async forcedMigration(
    tenantId: string,
    fromVersionId: string,
    toVersionId: string,
    adminReason?: string,
  ) {
    // This is effectively a forced bulk migration
    const results = await this.bulkMigrateApplications(
      tenantId,
      fromVersionId,
      toVersionId,
      MigrationStrategyDto.ForcedUpdate,
      undefined,
      false, // Skip validation for forced migration
    );

    return { ...results, adminReason };
  }

  /**
   * Validate that step mappings exist between two versions
   */
  async validateVersionMappings(tenantId: string, fromVersionId: string, toVersionId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Get both versions
    const [fromVersion, toVersion] = await Promise.all([
      tenantPrisma.visaWorkflowVersion.findFirst({
        where: { id: fromVersionId, tenantId },
        include: { steps: true },
      }),
      tenantPrisma.visaWorkflowVersion.findFirst({
        where: { id: toVersionId, tenantId },
        include: { steps: true },
      }),
    ]);

    if (!fromVersion || !toVersion) {
      throw new NotFoundException('One or both workflow versions not found');
    }

    // Check for compatible mappings
    const incompatibleSteps: any[] = [];

    for (const fromStep of fromVersion.steps) {
      // Try to find a compatible mapping or equivalent step
      const toStep = toVersion.steps.find((s) => s.stepOrder === fromStep.stepOrder);

      if (!toStep) {
        // Check if there's an explicit mapping
        const mapping = await tenantPrisma.stepMapping.findFirst({
          where: {
            fromStepId: fromStep.id,
            toStep: {
              versionId: toVersionId,
            },
          },
        });

        if (!mapping || !mapping.isCompatible) {
          incompatibleSteps.push({
            stepId: fromStep.id,
            stepName: fromStep.name,
            stepOrder: fromStep.stepOrder,
          });
        }
      }
    }

    if (incompatibleSteps.length > 0) {
      throw new BadRequestException(
        `Incompatible steps found. Cannot safely migrate. ${incompatibleSteps.length} step(s) have no mappings.`,
      );
    }

    return {
      compatible: true,
      fromVersionId,
      toVersionId,
    };
  }

  /**
   * Get migration history for an application
   */
  async getApplicationMigrationHistory(tenantId: string, applicationId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const history = await tenantPrisma.applicationMigrationLog.findMany({
      where: { applicationId, tenantId },
      include: {
        migration: {
          include: {
            fromVersion: true,
            toVersion: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return history;
  }

  /**
   * Get migration statistics
   */
  async getMigrationStatistics(tenantId: string, migrationId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const migration = await tenantPrisma.workflowVersionMigration.findFirst({
      where: { id: migrationId, tenantId },
      include: {
        fromVersion: true,
        toVersion: true,
        applicationMigrations: true,
      },
    });

    if (!migration) {
      throw new NotFoundException('Migration not found');
    }

    const logs = migration.applicationMigrations;
    const completed = logs.filter((l) => l.status === 'Completed').length;
    const failed = logs.filter((l) => l.status === 'Failed').length;
    const pending = logs.filter((l) => l.status === 'Pending').length;

    return {
      migrationId,
      fromVersionNumber: migration.fromVersion.versionNumber,
      toVersionNumber: migration.toVersion.versionNumber,
      strategy: migration.strategy,
      totalApplications: logs.length,
      completedMigrations: completed,
      failedMigrations: failed,
      pendingMigrations: pending,
      completionPercentage: logs.length > 0 ? (completed / logs.length) * 100 : 0,
      appliedAt: migration.appliedAt,
    };
  }
}
