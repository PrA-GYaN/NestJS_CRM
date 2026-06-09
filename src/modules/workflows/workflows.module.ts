import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowVersioningController } from './workflow-versioning.controller';
import { WorkflowVersioningService } from './workflow-versioning.service';
import { WorkflowMigrationService } from './workflow-migration.service';
import { WorkflowAnalyticsService } from './workflow-analytics.service';
import { TenantModule } from '../../common/tenant/tenant.module';
import { WorkflowExceptionFilter } from './filters';

@Module({
  imports: [TenantModule],
  controllers: [WorkflowsController, WorkflowVersioningController],
  providers: [
    WorkflowsService,
    WorkflowVersioningService,
    WorkflowMigrationService,
    WorkflowAnalyticsService,
    {
      provide: APP_FILTER,
      useClass: WorkflowExceptionFilter,
    },
  ],
  exports: [
    WorkflowsService,
    WorkflowVersioningService,
    WorkflowMigrationService,
    WorkflowAnalyticsService,
  ],
})
export class WorkflowsModule {}
