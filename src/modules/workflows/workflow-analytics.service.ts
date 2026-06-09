import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../common/tenant/tenant.service';

@Injectable()
export class WorkflowAnalyticsService {
  constructor(private tenantService: TenantService) {}

  /**
   * Get comprehensive analytics for all versions of a workflow
   */
  async getWorkflowVersionAnalytics(tenantId: string, workflowId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    // Verify workflow exists
    const workflow = await tenantPrisma.visaWorkflow.findFirst({
      where: { id: workflowId, tenantId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Get all versions with their metrics
    const versions = await tenantPrisma.visaWorkflowVersion.findMany({
      where: { workflowId, tenantId },
      include: {
        steps: true,
        applications: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });

    // Calculate metrics for each version
    const versionAnalytics = versions.map((version) => {
      const applications = version.applications;
      const applicationsInUse = applications.filter(
        (a) => !['Approved', 'Rejected'].includes(a.status),
      ).length;
      const applicationsCompleted = applications.filter((a) =>
        ['Approved', 'Rejected'].includes(a.status),
      ).length;
      const successRate =
        applications.length > 0 ? (applicationsCompleted / applications.length) * 100 : 0;

      return {
        versionId: version.id,
        versionNumber: version.versionNumber,
        status: version.status,
        stepsCount: version.steps.length,
        totalApplications: applications.length,
        applicationsInUse,
        applicationsCompleted,
        successRate: Math.round(successRate * 100) / 100,
        createdAt: version.createdAt,
        deprecatedAt: version.deprecatedAt,
        canBeDeleted: applicationsInUse === 0,
        isCurrentVersion: version.id === workflow.currentVersionId,
      };
    });

    // Get migration statistics
    const migrations = await tenantPrisma.workflowVersionMigration.findMany({
      where: { workflowId, tenantId },
      include: {
        fromVersion: true,
        toVersion: true,
        applicationMigrations: true,
      },
    });

    const migrationStats = migrations.map((migration) => {
      const logs = migration.applicationMigrations;
      const completed = logs.filter((l) => l.status === 'Completed').length;
      const failed = logs.filter((l) => l.status === 'Failed').length;
      const pending = logs.filter((l) => l.status === 'Pending').length;

      return {
        migrationId: migration.id,
        fromVersionNumber: migration.fromVersion.versionNumber,
        toVersionNumber: migration.toVersion.versionNumber,
        strategy: migration.strategy,
        totalApplicationsMigrated: logs.length,
        completedMigrations: completed,
        failedMigrations: failed,
        pendingMigrations: pending,
        successRate: logs.length > 0 ? (completed / logs.length) * 100 : 0,
        appliedAt: migration.appliedAt,
      };
    });

    return {
      workflowId,
      totalVersions: versions.length,
      currentVersion: workflow.currentVersionId,
      versions: versionAnalytics,
      migrations: migrationStats,
    };
  }

  /**
   * Get a dashboard overview of all workflows
   */
  async getWorkflowsDashboard(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const workflows = await tenantPrisma.visaWorkflow.findMany({
      where: { tenantId },
      include: {
        versions: {
          include: {
            _count: {
              select: {
                applications: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            versions: true,
          },
        },
      },
    });

    return workflows.map((workflow) => {
      const activeVersion = workflow.versions.find((v) => v.status === 'Active');
      const deprecatedVersions = workflow.versions.filter((v) => v.status === 'Deprecated').length;
      const draftVersions = workflow.versions.filter((v) => v.status === 'Draft').length;

      return {
        workflowId: workflow.id,
        name: workflow.name,
        description: workflow.description,
        isActive: workflow.isActive,
        totalVersions: workflow._count.versions,
        activeVersionNumber: activeVersion?.versionNumber,
        deprecatedVersions,
        draftVersions,
        totalApplications: workflow._count.applications,
        createdAt: workflow.createdAt,
      };
    });
  }

  /**
   * Get migration progress and statistics
   */
  async getMigrationProgress(tenantId: string, migrationId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const migration = await tenantPrisma.workflowVersionMigration.findFirst({
      where: { id: migrationId, tenantId },
      include: {
        fromVersion: true,
        toVersion: true,
        applicationMigrations: {
          include: {
            migration: true,
          },
        },
      },
    });

    if (!migration) {
      throw new NotFoundException('Migration not found');
    }

    const logs = migration.applicationMigrations;
    const completed = logs.filter((l) => l.status === 'Completed').length;
    const failed = logs.filter((l) => l.status === 'Failed').length;
    const pending = logs.filter((l) => l.status === 'Pending').length;

    const failedApplications = logs
      .filter((l) => l.status === 'Failed')
      .map((l) => ({
        applicationId: l.applicationId,
        errorMessage: l.errorMessage,
      }));

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
      successRate: logs.length > 0 ? (completed / logs.length) * 100 : 0,
      appliedAt: migration.appliedAt,
      failedApplications,
    };
  }

  /**
   * Get applications using a specific version
   */
  async getApplicationsByVersion(tenantId: string, versionId: string, filters?: any) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const whereClause: any = { workflowVersionId: versionId, tenantId };

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.studentId) {
      whereClause.studentId = filters.studentId;
    }

    const applications = await tenantPrisma.visaApplication.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        workflowVersion: {
          select: {
            versionNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      versionId,
      totalApplications: applications.length,
      applications,
    };
  }

  /**
   * Identify safe-to-delete versions
   */
  async getSafeToDeleteVersions(tenantId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const versions = await tenantPrisma.visaWorkflowVersion.findMany({
      where: { tenantId },
      include: {
        workflow: true,
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    const safeToDelete = versions
      .filter((v) => v._count.applications === 0 && v.status !== 'Active')
      .map((v) => ({
        versionId: v.id,
        workflowId: v.workflowId,
        versionNumber: v.versionNumber,
        status: v.status,
        applicationsCount: v._count.applications,
        createdAt: v.createdAt,
        deprecatedAt: v.deprecatedAt,
      }));

    return {
      safeToDeleteCount: safeToDelete.length,
      versions: safeToDelete,
    };
  }

  /**
   * Get version lifecycle statistics
   */
  async getVersionLifecycleStats(tenantId: string, versionId: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const version = await tenantPrisma.visaWorkflowVersion.findFirst({
      where: { id: versionId, tenantId },
      include: {
        applications: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            version: true,
          },
        },
        history: true,
      },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    const applications = version.applications;
    const statuses = {
      pending: applications.filter((a) => a.status === 'Pending').length,
      submitted: applications.filter((a) => a.status === 'Submitted').length,
      underReview: applications.filter((a) => a.status === 'UnderReview').length,
      approved: applications.filter((a) => a.status === 'Approved').length,
      rejected: applications.filter((a) => a.status === 'Rejected').length,
    };

    const avgTimeToCompletion = this.calculateAvgTimeToCompletion(applications);

    return {
      versionId,
      versionNumber: version.versionNumber,
      status: version.status,
      statusDistribution: statuses,
      totalApplications: applications.length,
      averageTimeToCompletionDays: Math.round(avgTimeToCompletion),
      createdAt: version.createdAt,
      deprecatedAt: version.deprecatedAt,
      changeHistory: version.history,
    };
  }

  /**
   * Helper: Calculate average time to completion
   */
  private calculateAvgTimeToCompletion(applications: any[]): number {
    const completedApps = applications.filter((a) => ['Approved', 'Rejected'].includes(a.status));

    if (completedApps.length === 0) {
      return 0;
    }

    const totalDays = completedApps.reduce((sum, app) => {
      const days = Math.floor(
        (app.updatedAt.getTime() - app.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      return sum + days;
    }, 0);

    return totalDays / completedApps.length;
  }

  /**
   * Get detailed version comparison
   */
  async compareVersions(tenantId: string, versionId1: string, versionId2: string) {
    const tenantPrisma = await this.tenantService.getTenantPrisma(tenantId);

    const [version1, version2] = await Promise.all([
      tenantPrisma.visaWorkflowVersion.findFirst({
        where: { id: versionId1, tenantId },
        include: {
          steps: { orderBy: { stepOrder: 'asc' } },
          _count: { select: { applications: true } },
        },
      }),
      tenantPrisma.visaWorkflowVersion.findFirst({
        where: { id: versionId2, tenantId },
        include: {
          steps: { orderBy: { stepOrder: 'asc' } },
          _count: { select: { applications: true } },
        },
      }),
    ]);

    if (!version1 || !version2) {
      throw new NotFoundException('One or both versions not found');
    }

    // Compare steps
    const stepDifferences: any[] = [];

    for (let i = 0; i < Math.max(version1.steps.length, version2.steps.length); i++) {
      const step1 = version1.steps[i];
      const step2 = version2.steps[i];

      if (!step1 && step2) {
        stepDifferences.push({
          type: 'added',
          step: step2,
        });
      } else if (step1 && !step2) {
        stepDifferences.push({
          type: 'removed',
          step: step1,
        });
      } else if (step1 && step2) {
        const differences = this.compareStepChanges(step1, step2);
        if (differences.length > 0) {
          stepDifferences.push({
            type: 'modified',
            step1,
            step2,
            differences,
          });
        }
      }
    }

    return {
      version1: {
        versionId: version1.id,
        versionNumber: version1.versionNumber,
        stepsCount: version1.steps.length,
        applicationsCount: version1._count.applications,
        createdAt: version1.createdAt,
      },
      version2: {
        versionId: version2.id,
        versionNumber: version2.versionNumber,
        stepsCount: version2.steps.length,
        applicationsCount: version2._count.applications,
        createdAt: version2.createdAt,
      },
      stepDifferences,
    };
  }

  /**
   * Helper: Compare changes between two steps
   */
  private compareStepChanges(step1: any, step2: any): any[] {
    const changes = [];

    if (step1.name !== step2.name) {
      changes.push({ field: 'name', oldValue: step1.name, newValue: step2.name });
    }
    if (step1.description !== step2.description) {
      changes.push({
        field: 'description',
        oldValue: step1.description,
        newValue: step2.description,
      });
    }
    if (step1.requiresDocument !== step2.requiresDocument) {
      changes.push({
        field: 'requiresDocument',
        oldValue: step1.requiresDocument,
        newValue: step2.requiresDocument,
      });
    }
    if (step1.expectedDurationDays !== step2.expectedDurationDays) {
      changes.push({
        field: 'expectedDurationDays',
        oldValue: step1.expectedDurationDays,
        newValue: step2.expectedDurationDays,
      });
    }
    if (step1.isActive !== step2.isActive) {
      changes.push({ field: 'isActive', oldValue: step1.isActive, newValue: step2.isActive });
    }

    return changes;
  }
}
