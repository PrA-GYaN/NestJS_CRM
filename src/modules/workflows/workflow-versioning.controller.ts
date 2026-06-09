import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { WorkflowVersioningService } from './workflow-versioning.service';
import { WorkflowMigrationService } from './workflow-migration.service';
import { WorkflowAnalyticsService } from './workflow-analytics.service';
import {
  CreateWorkflowVersionDto,
  ActivateWorkflowVersionDto,
  DeprecateWorkflowVersionDto,
  DefineStepMappingDto,
  MigrationStrategyDto,
  MigrateApplicationDto,
  BulkMigrateApplicationsDto,
  ForcedMigrationDto,
  CreateVersionFromCurrentDto,
} from './dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  CanCreate,
  CanRead,
  CanUpdate,
  CanDelete,
} from '../../common/decorators/permissions.decorator';
import { WorkflowResponseFactory } from './utils/workflow-response.builder';
import {
  WorkflowVersionOperationCode,
  WorkflowMigrationOperationCode,
} from './dto/workflow-error-codes';

@ApiTags('Workflow Versioning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workflow-versions')
export class WorkflowVersioningController {
  constructor(
    private versioningService: WorkflowVersioningService,
    private migrationService: WorkflowMigrationService,
    private analyticsService: WorkflowAnalyticsService,
  ) {}

  // ============ VERSION MANAGEMENT ENDPOINTS ============

  @Post()
  @CanCreate('workflows')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new workflow version',
    description: 'Create a new version with custom steps for a workflow',
  })
  @ApiResponse({ status: 201, description: 'Workflow version created successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Invalid steps configuration' })
  async createWorkflowVersion(
    @TenantId() tenantId: string,
    @Body() createDto: CreateWorkflowVersionDto,
  ) {
    const version = await this.versioningService.createWorkflowVersion(tenantId, createDto);
    return WorkflowResponseFactory.created(
      version,
      'Workflow version created successfully',
      WorkflowVersionOperationCode.VERSION_CREATED,
    );
  }

  @Post('from-current')
  @CanCreate('workflows')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create version from current workflow',
    description: 'Create a new version by copying steps from current workflow structure',
  })
  @ApiResponse({ status: 201, description: 'Version created from current workflow' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async createVersionFromCurrent(
    @TenantId() tenantId: string,
    @Body() createDto: CreateVersionFromCurrentDto,
  ) {
    const version = await this.versioningService.createVersionFromCurrent(tenantId, createDto);
    return WorkflowResponseFactory.created(
      version,
      'Version created from current workflow structure',
      WorkflowVersionOperationCode.VERSION_CREATED,
    );
  }

  @Get(':versionId')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get workflow version details' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns version details with steps' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async getWorkflowVersion(@TenantId() tenantId: string, @Param('versionId') versionId: string) {
    const version = await this.versioningService.getWorkflowVersion(tenantId, versionId);
    return WorkflowResponseFactory.success(
      version,
      'Workflow version retrieved successfully',
      WorkflowVersionOperationCode.VERSION_RETRIEVED,
    );
  }

  @Get('workflow/:workflowId/versions')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get all versions of a workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of workflow versions' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflowVersions(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const result = await this.versioningService.getWorkflowVersions(
      tenantId,
      workflowId,
      paginationDto,
    );
    return WorkflowResponseFactory.list(
      result.data,
      result.total,
      result.page,
      result.limit,
      'Workflow versions retrieved successfully',
      WorkflowVersionOperationCode.VERSIONS_RETRIEVED,
    );
  }

  @Put(':versionId/activate')
  @CanUpdate('workflows')
  @ApiOperation({ summary: 'Activate a workflow version' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Version activated successfully' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  @ApiResponse({ status: 400, description: 'Cannot activate deprecated or archived version' })
  async activateVersion(
    @TenantId() tenantId: string,
    @Param('versionId') versionId: string,
    @Body() activateDto: ActivateWorkflowVersionDto,
  ) {
    const version = await this.versioningService.activateWorkflowVersion(tenantId, {
      ...activateDto,
      versionId,
    });
    return WorkflowResponseFactory.updated(
      version,
      'Workflow version activated successfully',
      WorkflowVersionOperationCode.VERSION_ACTIVATED,
    );
  }

  @Put(':versionId/deprecate')
  @CanUpdate('workflows')
  @ApiOperation({ summary: 'Deprecate a workflow version' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Version deprecated successfully' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  @ApiResponse({ status: 400, description: 'Version is already deprecated' })
  async deprecateVersion(
    @TenantId() tenantId: string,
    @Param('versionId') versionId: string,
    @Body() deprecateDto: DeprecateWorkflowVersionDto,
  ) {
    const version = await this.versioningService.deprecateWorkflowVersion(tenantId, {
      ...deprecateDto,
      versionId,
    });
    return WorkflowResponseFactory.updated(
      version,
      'Workflow version deprecated successfully',
      WorkflowVersionOperationCode.VERSION_DEPRECATED,
    );
  }

  @Delete(':versionId')
  @CanDelete('workflows')
  @ApiOperation({ summary: 'Delete a workflow version' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Version deleted successfully' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete version with active applications',
  })
  async deleteVersion(@TenantId() tenantId: string, @Param('versionId') versionId: string) {
    await this.versioningService.deleteWorkflowVersion(tenantId, versionId);
    return WorkflowResponseFactory.deleted(
      'Workflow version deleted successfully',
      WorkflowVersionOperationCode.VERSION_DELETED,
    );
  }

  @Get(':versionId/history')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get version change history' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns version changelog' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async getVersionHistory(@TenantId() tenantId: string, @Param('versionId') versionId: string) {
    const history = await this.versioningService.getVersionHistory(tenantId, versionId);
    return WorkflowResponseFactory.success(
      history,
      'Version history retrieved successfully',
      WorkflowVersionOperationCode.VERSION_HISTORY_RETRIEVED,
    );
  }

  // ============ STEP MAPPING ENDPOINTS ============

  @Post('step-mappings/define')
  @CanCreate('workflows')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Define step mappings between versions',
    description:
      'Create mappings between steps in different workflow versions for migration compatibility',
  })
  @ApiResponse({ status: 201, description: 'Step mappings defined successfully' })
  @ApiResponse({ status: 404, description: 'One or both versions not found' })
  async defineStepMappings(
    @TenantId() tenantId: string,
    @Body() defineMappingDto: DefineStepMappingDto,
  ) {
    const mappings = await this.versioningService.defineStepMappings(tenantId, defineMappingDto);
    return WorkflowResponseFactory.created(
      mappings,
      'Step mappings defined successfully',
      WorkflowVersionOperationCode.STEP_MAPPINGS_DEFINED,
    );
  }

  @Get('step-mappings/:fromVersionId/:toVersionId')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get step mappings between two versions' })
  @ApiParam({ name: 'fromVersionId', description: 'Source Workflow Version ID' })
  @ApiParam({ name: 'toVersionId', description: 'Target Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns step mappings and version details' })
  @ApiResponse({ status: 404, description: 'One or both versions not found' })
  async getStepMappings(
    @TenantId() tenantId: string,
    @Param('fromVersionId') fromVersionId: string,
    @Param('toVersionId') toVersionId: string,
  ) {
    const mappings = await this.versioningService.getStepMappings(
      tenantId,
      fromVersionId,
      toVersionId,
    );
    return WorkflowResponseFactory.success(
      mappings,
      'Step mappings retrieved successfully',
      WorkflowVersionOperationCode.STEP_MAPPINGS_RETRIEVED,
    );
  }

  // ============ MIGRATION ENDPOINTS ============

  @Post('migrations/application')
  @CanUpdate('visa-applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Migrate single application to new version',
    description: 'Move a single visa application to a newer workflow version',
  })
  @ApiResponse({ status: 200, description: 'Application migrated successfully' })
  @ApiResponse({ status: 404, description: 'Application or version not found' })
  @ApiResponse({ status: 409, description: 'Application is completed, cannot migrate' })
  async migrateApplication(
    @TenantId() tenantId: string,
    @Body() migrateDto: MigrateApplicationDto,
  ) {
    const result = await this.migrationService.migrateApplication(
      tenantId,
      migrateDto.applicationId,
      migrateDto.toVersionId,
      migrateDto.strategy,
      migrateDto.targetStepId,
      migrateDto.notes,
    );
    return WorkflowResponseFactory.success(
      result,
      'Application migrated to new workflow version successfully',
      WorkflowMigrationOperationCode.MIGRATION_COMPLETED,
    );
  }

  @Post('migrations/bulk')
  @CanUpdate('visa-applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk migrate applications',
    description:
      'Migrate multiple applications from one workflow version to another using specified strategy',
  })
  @ApiResponse({ status: 200, description: 'Bulk migration executed' })
  @ApiResponse({ status: 404, description: 'One or both versions not found' })
  async bulkMigrateApplications(
    @TenantId() tenantId: string,
    @Body() bulkMigrateDto: BulkMigrateApplicationsDto,
  ) {
    const result = await this.migrationService.bulkMigrateApplications(
      tenantId,
      bulkMigrateDto.fromVersionId,
      bulkMigrateDto.toVersionId,
      bulkMigrateDto.strategy,
      bulkMigrateDto.statusFilters,
      bulkMigrateDto.validateMappings,
    );
    return WorkflowResponseFactory.success(
      result,
      'Bulk migration completed successfully',
      WorkflowMigrationOperationCode.MIGRATION_COMPLETED,
    );
  }

  @Post('migrations/forced')
  @CanUpdate('visa-applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Forced migration of all applications',
    description: 'Force migrate all applications to a new version without validation (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Forced migration executed' })
  @ApiResponse({ status: 404, description: 'One or both versions not found' })
  async forcedMigration(
    @TenantId() tenantId: string,
    @Body() forcedMigrationDto: ForcedMigrationDto,
  ) {
    if (!forcedMigrationDto.force) {
      throw new Error('Force parameter must be true for forced migration');
    }

    const result = await this.migrationService.forcedMigration(
      tenantId,
      forcedMigrationDto.fromVersionId,
      forcedMigrationDto.toVersionId,
      forcedMigrationDto.adminReason,
    );
    return WorkflowResponseFactory.success(
      result,
      'Forced migration executed successfully',
      WorkflowMigrationOperationCode.MIGRATION_FORCED,
    );
  }

  @Get('migrations/:migrationId/progress')
  @CanRead('visa-applications')
  @ApiOperation({ summary: 'Get migration progress and statistics' })
  @ApiParam({ name: 'migrationId', description: 'Migration ID' })
  @ApiResponse({ status: 200, description: 'Returns migration progress details' })
  @ApiResponse({ status: 404, description: 'Migration not found' })
  async getMigrationProgress(
    @TenantId() tenantId: string,
    @Param('migrationId') migrationId: string,
  ) {
    const progress = await this.analyticsService.getMigrationProgress(tenantId, migrationId);
    return WorkflowResponseFactory.success(
      progress,
      'Migration progress retrieved successfully',
      WorkflowMigrationOperationCode.MIGRATION_PROGRESS_RETRIEVED,
    );
  }

  @Get('validate-mappings/:fromVersionId/:toVersionId')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Validate step mappings between versions' })
  @ApiParam({ name: 'fromVersionId', description: 'Source Version ID' })
  @ApiParam({ name: 'toVersionId', description: 'Target Version ID' })
  @ApiResponse({ status: 200, description: 'Validation successful' })
  @ApiResponse({ status: 400, description: 'Incompatible steps found' })
  async validateVersionMappings(
    @TenantId() tenantId: string,
    @Param('fromVersionId') fromVersionId: string,
    @Param('toVersionId') toVersionId: string,
  ) {
    const result = await this.migrationService.validateVersionMappings(
      tenantId,
      fromVersionId,
      toVersionId,
    );
    return WorkflowResponseFactory.success(
      result,
      'Version mappings validation successful',
      WorkflowMigrationOperationCode.MIGRATION_VALIDATED,
    );
  }

  @Get('application/:applicationId/migration-history')
  @CanRead('visa-applications')
  @ApiOperation({ summary: 'Get application migration history' })
  @ApiParam({ name: 'applicationId', description: 'Visa Application ID' })
  @ApiResponse({ status: 200, description: 'Returns migration history for application' })
  async getApplicationMigrationHistory(
    @TenantId() tenantId: string,
    @Param('applicationId') applicationId: string,
  ) {
    const history = await this.migrationService.getApplicationMigrationHistory(
      tenantId,
      applicationId,
    );
    return WorkflowResponseFactory.success(
      history,
      'Application migration history retrieved successfully',
      WorkflowMigrationOperationCode.MIGRATION_HISTORY_RETRIEVED,
    );
  }

  // ============ ANALYTICS & DASHBOARD ENDPOINTS ============

  @Get('analytics/dashboard')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get workflows dashboard overview' })
  @ApiResponse({ status: 200, description: 'Returns dashboard overview of all workflows' })
  async getWorkflowsDashboard(@TenantId() tenantId: string) {
    const dashboard = await this.analyticsService.getWorkflowsDashboard(tenantId);
    return WorkflowResponseFactory.success(
      dashboard,
      'Workflows dashboard retrieved successfully',
      WorkflowVersionOperationCode.ANALYTICS_RETRIEVED,
    );
  }

  @Get('analytics/workflow/:workflowId')
  @CanRead('workflows')
  @ApiOperation({
    summary: 'Get workflow version analytics',
    description:
      'Get comprehensive analytics for all versions of a workflow including usage and migrations',
  })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Returns detailed version analytics' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflowAnalytics(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
  ) {
    const analytics = await this.analyticsService.getWorkflowVersionAnalytics(tenantId, workflowId);
    return WorkflowResponseFactory.success(
      analytics,
      'Workflow analytics retrieved successfully',
      WorkflowVersionOperationCode.ANALYTICS_RETRIEVED,
    );
  }

  @Get('analytics/safe-to-delete')
  @CanRead('workflows')
  @ApiOperation({
    summary: 'Identify safe-to-delete versions',
    description:
      'Get list of workflow versions that have no applications and can be safely deleted',
  })
  @ApiResponse({ status: 200, description: 'Returns list of deletable versions' })
  async getSafeToDeleteVersions(@TenantId() tenantId: string) {
    const deletable = await this.analyticsService.getSafeToDeleteVersions(tenantId);
    return WorkflowResponseFactory.success(
      deletable,
      'Safe-to-delete versions identified',
      WorkflowVersionOperationCode.ANALYTICS_RETRIEVED,
    );
  }

  @Get('analytics/version/:versionId/lifecycle')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get version lifecycle statistics' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns lifecycle statistics' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async getVersionLifecycleStats(
    @TenantId() tenantId: string,
    @Param('versionId') versionId: string,
  ) {
    const stats = await this.analyticsService.getVersionLifecycleStats(tenantId, versionId);
    return WorkflowResponseFactory.success(
      stats,
      'Version lifecycle statistics retrieved successfully',
      WorkflowVersionOperationCode.ANALYTICS_RETRIEVED,
    );
  }

  @Get('analytics/version/:versionId/applications')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get applications using a version' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns applications using the version' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async getApplicationsByVersion(
    @TenantId() tenantId: string,
    @Param('versionId') versionId: string,
    @Query() filters?: any,
  ) {
    const applications = await this.analyticsService.getApplicationsByVersion(
      tenantId,
      versionId,
      filters,
    );
    return WorkflowResponseFactory.success(
      applications,
      'Applications using version retrieved successfully',
      WorkflowVersionOperationCode.ANALYTICS_RETRIEVED,
    );
  }

  @Get('analytics/compare/:versionId1/:versionId2')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Compare two workflow versions' })
  @ApiParam({ name: 'versionId1', description: 'First Workflow Version ID' })
  @ApiParam({ name: 'versionId2', description: 'Second Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns detailed comparison' })
  @ApiResponse({ status: 404, description: 'One or both versions not found' })
  async compareVersions(
    @TenantId() tenantId: string,
    @Param('versionId1') versionId1: string,
    @Param('versionId2') versionId2: string,
  ) {
    const comparison = await this.analyticsService.compareVersions(
      tenantId,
      versionId1,
      versionId2,
    );
    return WorkflowResponseFactory.success(
      comparison,
      'Version comparison completed successfully',
      WorkflowVersionOperationCode.ANALYTICS_RETRIEVED,
    );
  }
}
