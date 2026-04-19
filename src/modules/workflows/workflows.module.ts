import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowVersioningController } from './workflow-versioning.controller';
import { WorkflowVersioningService } from './workflow-versioning.service';
import { WorkflowMigrationService } from './workflow-migration.service';
import { WorkflowAnalyticsService } from './workflow-analytics.service';
import { TenantModule } from '../../common/tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [WorkflowsController, WorkflowVersioningController],
  providers: [
    WorkflowsService,
    WorkflowVersioningService,
    WorkflowMigrationService,
    WorkflowAnalyticsService,
  ],
  exports: [
    WorkflowsService,
    WorkflowVersioningService,
    WorkflowMigrationService,
    WorkflowAnalyticsService,
  ],
})
export class WorkflowsModule {}
