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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
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
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';

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
  createWorkflowVersion(
    @TenantId() tenantId: string,
    @Body() createDto: CreateWorkflowVersionDto,
  ) {
    return this.versioningService.createWorkflowVersion(tenantId, createDto);
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
  createVersionFromCurrent(
    @TenantId() tenantId: string,
    @Body() createDto: CreateVersionFromCurrentDto,
  ) {
    return this.versioningService.createVersionFromCurrent(tenantId, createDto);
  }

  @Get(':versionId')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get workflow version details' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns version details with steps' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  getWorkflowVersion(@TenantId() tenantId: string, @Param('versionId') versionId: string) {
    return this.versioningService.getWorkflowVersion(tenantId, versionId);
  }

  @Get('workflow/:workflowId/versions')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get all versions of a workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of workflow versions' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  getWorkflowVersions(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.versioningService.getWorkflowVersions(tenantId, workflowId, paginationDto);
  }

  @Put(':versionId/activate')
  @CanUpdate('workflows')
  @ApiOperation({ summary: 'Activate a workflow version' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Version activated successfully' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  @ApiResponse({ status: 400, description: 'Cannot activate deprecated or archived version' })
  activateVersion(
    @TenantId() tenantId: string,
    @Param('versionId') versionId: string,
    @Body() activateDto: ActivateWorkflowVersionDto,
  ) {
    return this.versioningService.activateWorkflowVersion(tenantId, {
      ...activateDto,
      versionId,
    });
  }

  @Put(':versionId/deprecate')
  @CanUpdate('workflows')
  @ApiOperation({ summary: 'Deprecate a workflow version' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Version deprecated successfully' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  @ApiResponse({ status: 400, description: 'Version is already deprecated' })
  deprecateVersion(
    @TenantId() tenantId: string,
    @Param('versionId') versionId: string,
    @Body() deprecateDto: DeprecateWorkflowVersionDto,
  ) {
    return this.versioningService.deprecateWorkflowVersion(tenantId, {
      ...deprecateDto,
      versionId,
    });
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
  deleteVersion(@TenantId() tenantId: string, @Param('versionId') versionId: string) {
    return this.versioningService.deleteWorkflowVersion(tenantId, versionId);
  }

  @Get(':versionId/history')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get version change history' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns version changelog' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  getVersionHistory(@TenantId() tenantId: string, @Param('versionId') versionId: string) {
    return this.versioningService.getVersionHistory(tenantId, versionId);
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
  defineStepMappings(
    @TenantId() tenantId: string,
    @Body() defineMappingDto: DefineStepMappingDto,
  ) {
    return this.versioningService.defineStepMappings(tenantId, defineMappingDto);
  }

  @Get('step-mappings/:fromVersionId/:toVersionId')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get step mappings between two versions' })
  @ApiParam({ name: 'fromVersionId', description: 'Source Workflow Version ID' })
  @ApiParam({ name: 'toVersionId', description: 'Target Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns step mappings and version details' })
  @ApiResponse({ status: 404, description: 'One or both versions not found' })
  getStepMappings(
    @TenantId() tenantId: string,
    @Param('fromVersionId') fromVersionId: string,
    @Param('toVersionId') toVersionId: string,
  ) {
    return this.versioningService.getStepMappings(tenantId, fromVersionId, toVersionId);
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
  migrateApplication(
    @TenantId() tenantId: string,
    @Body() migrateDto: MigrateApplicationDto,
  ) {
    return this.migrationService.migrateApplication(
      tenantId,
      migrateDto.applicationId,
      migrateDto.toVersionId,
      migrateDto.strategy,
      migrateDto.targetStepId,
      migrateDto.notes,
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
  bulkMigrateApplications(
    @TenantId() tenantId: string,
    @Body() bulkMigrateDto: BulkMigrateApplicationsDto,
  ) {
    return this.migrationService.bulkMigrateApplications(
      tenantId,
      bulkMigrateDto.fromVersionId,
      bulkMigrateDto.toVersionId,
      bulkMigrateDto.strategy,
      bulkMigrateDto.statusFilters,
      bulkMigrateDto.validateMappings,
    );
  }

  @Post('migrations/forced')
  @CanUpdate('visa-applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Forced migration of all applications',
    description:
      'Force migrate all applications to a new version without validation (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Forced migration executed' })
  @ApiResponse({ status: 404, description: 'One or both versions not found' })
  forcedMigration(
    @TenantId() tenantId: string,
    @Body() forcedMigrationDto: ForcedMigrationDto,
  ) {
    if (!forcedMigrationDto.force) {
      throw new Error('Force parameter must be true for forced migration');
    }

    return this.migrationService.forcedMigration(
      tenantId,
      forcedMigrationDto.fromVersionId,
      forcedMigrationDto.toVersionId,
      forcedMigrationDto.adminReason,
    );
  }

  @Get('migrations/:migrationId/progress')
  @CanRead('visa-applications')
  @ApiOperation({ summary: 'Get migration progress and statistics' })
  @ApiParam({ name: 'migrationId', description: 'Migration ID' })
  @ApiResponse({ status: 200, description: 'Returns migration progress details' })
  @ApiResponse({ status: 404, description: 'Migration not found' })
  getMigrationProgress(
    @TenantId() tenantId: string,
    @Param('migrationId') migrationId: string,
  ) {
    return this.analyticsService.getMigrationProgress(tenantId, migrationId);
  }

  @Get('validate-mappings/:fromVersionId/:toVersionId')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Validate step mappings between versions' })
  @ApiParam({ name: 'fromVersionId', description: 'Source Version ID' })
  @ApiParam({ name: 'toVersionId', description: 'Target Version ID' })
  @ApiResponse({ status: 200, description: 'Validation successful' })
  @ApiResponse({ status: 400, description: 'Incompatible steps found' })
  validateVersionMappings(
    @TenantId() tenantId: string,
    @Param('fromVersionId') fromVersionId: string,
    @Param('toVersionId') toVersionId: string,
  ) {
    return this.migrationService.validateVersionMappings(tenantId, fromVersionId, toVersionId);
  }

  @Get('application/:applicationId/migration-history')
  @CanRead('visa-applications')
  @ApiOperation({ summary: 'Get application migration history' })
  @ApiParam({ name: 'applicationId', description: 'Visa Application ID' })
  @ApiResponse({ status: 200, description: 'Returns migration history for application' })
  getApplicationMigrationHistory(
    @TenantId() tenantId: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.migrationService.getApplicationMigrationHistory(tenantId, applicationId);
  }

  // ============ ANALYTICS & DASHBOARD ENDPOINTS ============

  @Get('analytics/dashboard')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get workflows dashboard overview' })
  @ApiResponse({ status: 200, description: 'Returns dashboard overview of all workflows' })
  getWorkflowsDashboard(@TenantId() tenantId: string) {
    return this.analyticsService.getWorkflowsDashboard(tenantId);
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
  getWorkflowAnalytics(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.analyticsService.getWorkflowVersionAnalytics(tenantId, workflowId);
  }

  @Get('analytics/safe-to-delete')
  @CanRead('workflows')
  @ApiOperation({
    summary: 'Identify safe-to-delete versions',
    description: 'Get list of workflow versions that have no applications and can be safely deleted',
  })
  @ApiResponse({ status: 200, description: 'Returns list of deletable versions' })
  getSafeToDeleteVersions(@TenantId() tenantId: string) {
    return this.analyticsService.getSafeToDeleteVersions(tenantId);
  }

  @Get('analytics/version/:versionId/lifecycle')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get version lifecycle statistics' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns lifecycle statistics' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  getVersionLifecycleStats(
    @TenantId() tenantId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.analyticsService.getVersionLifecycleStats(tenantId, versionId);
  }

  @Get('analytics/version/:versionId/applications')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get applications using a version' })
  @ApiParam({ name: 'versionId', description: 'Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns applications using the version' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  getApplicationsByVersion(
    @TenantId() tenantId: string,
    @Param('versionId') versionId: string,
    @Query() filters?: any,
  ) {
    return this.analyticsService.getApplicationsByVersion(tenantId, versionId, filters);
  }

  @Get('analytics/compare/:versionId1/:versionId2')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Compare two workflow versions' })
  @ApiParam({ name: 'versionId1', description: 'First Workflow Version ID' })
  @ApiParam({ name: 'versionId2', description: 'Second Workflow Version ID' })
  @ApiResponse({ status: 200, description: 'Returns detailed comparison' })
  @ApiResponse({ status: 404, description: 'One or both versions not found' })
  compareVersions(
    @TenantId() tenantId: string,
    @Param('versionId1') versionId1: string,
    @Param('versionId2') versionId2: string,
  ) {
    return this.analyticsService.compareVersions(tenantId, versionId1, versionId2);
  }
}
