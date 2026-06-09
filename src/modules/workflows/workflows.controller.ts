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
  ParseArrayPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateWorkflowStepDto,
  UpdateWorkflowStepDto,
  WorkflowResponse,
  WorkflowListResponse,
} from './dto';
import { ReorderStepItemDto } from './dto/reorder-workflow-steps.dto';
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
import {
  WorkflowResponseBuilder,
  WorkflowResponseFactory,
} from './utils/workflow-response.builder';
import { WorkflowOperationCode, WorkflowStepOperationCode } from './dto/workflow-error-codes';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  // ============ Workflow Endpoints ============

  @Post()
  @CanCreate('workflows')
  @ApiOperation({ summary: 'Create new workflow' })
  @ApiResponse({
    status: 201,
    description: 'Workflow created successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Visa type not found' })
  @ApiResponse({ status: 400, description: 'Invalid workflow data' })
  async createWorkflow(
    @TenantId() tenantId: string,
    @Body() createWorkflowDto: CreateWorkflowDto,
  ): Promise<WorkflowResponse> {
    const workflow = await this.workflowsService.createWorkflow(tenantId, createWorkflowDto);
    return WorkflowResponseFactory.created(
      workflow,
      'Workflow created successfully',
      WorkflowOperationCode.WORKFLOW_CREATED,
    );
  }

  @Get()
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get all workflows with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of workflows',
    type: WorkflowListResponse,
  })
  async getAllWorkflows(
    @TenantId() tenantId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<WorkflowListResponse<any>> {
    const result = await this.workflowsService.getAllWorkflows(tenantId, paginationDto);
    return WorkflowResponseFactory.list(
      result.data,
      result.total,
      result.page,
      result.limit,
      'Workflows retrieved successfully',
      WorkflowOperationCode.WORKFLOWS_RETRIEVED,
    );
  }

  @Get('by-visa-type/:visaTypeId')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get workflows by visa type' })
  @ApiParam({ name: 'visaTypeId', description: 'Visa Type ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of workflows for the visa type',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Visa type not found' })
  async getWorkflowsByVisaType(
    @TenantId() tenantId: string,
    @Param('visaTypeId') visaTypeId: string,
  ): Promise<WorkflowResponse> {
    const workflows = await this.workflowsService.getWorkflowsByVisaType(tenantId, visaTypeId);
    return WorkflowResponseFactory.success(
      workflows,
      `${workflows.length} workflow(s) found for this visa type`,
      WorkflowOperationCode.WORKFLOWS_RETRIEVED,
    );
  }

  @Get(':id')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns workflow details with steps',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflowById(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
  ): Promise<WorkflowResponse> {
    const workflow = await this.workflowsService.getWorkflowById(tenantId, params.id);
    return WorkflowResponseFactory.success(
      workflow,
      'Workflow retrieved successfully',
      WorkflowOperationCode.WORKFLOW_RETRIEVED,
    );
  }

  @Put(':id')
  @CanUpdate('workflows')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({
    status: 200,
    description: 'Workflow updated successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async updateWorkflow(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ): Promise<WorkflowResponse> {
    const workflow = await this.workflowsService.updateWorkflow(
      tenantId,
      params.id,
      updateWorkflowDto,
    );
    return WorkflowResponseFactory.updated(
      workflow,
      'Workflow updated successfully',
      WorkflowOperationCode.WORKFLOW_UPDATED,
    );
  }

  @Delete(':id')
  @CanDelete('workflows')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({
    status: 200,
    description: 'Workflow deleted successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async deleteWorkflow(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
  ): Promise<WorkflowResponse> {
    await this.workflowsService.deleteWorkflow(tenantId, params.id);
    return WorkflowResponseFactory.deleted(
      'Workflow deleted successfully',
      WorkflowOperationCode.WORKFLOW_DELETED,
      { id: params.id },
    );
  }

  // ============ Workflow Step Endpoints ============

  @Post(':workflowId/steps')
  @ApiOperation({ summary: 'Add step to workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({
    status: 201,
    description: 'Workflow step created successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 409, description: 'Step order already exists' })
  async addWorkflowStep(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Body() createStepDto: CreateWorkflowStepDto,
  ): Promise<WorkflowResponse> {
    const step = await this.workflowsService.addWorkflowStep(tenantId, workflowId, createStepDto);
    return WorkflowResponseFactory.created(
      step,
      `Step "${step.name}" added successfully`,
      WorkflowStepOperationCode.STEP_CREATED,
    );
  }

  @Get(':workflowId/steps')
  @ApiOperation({ summary: 'Get all steps for a workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns ordered list of workflow steps',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflowSteps(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
  ): Promise<WorkflowResponse> {
    const steps = await this.workflowsService.getWorkflowSteps(tenantId, workflowId);
    return WorkflowResponseFactory.success(
      steps,
      `${steps.length} step(s) found`,
      WorkflowStepOperationCode.STEPS_RETRIEVED,
    );
  }

  @Get(':workflowId/steps/:stepId')
  @ApiOperation({ summary: 'Get workflow step by ID' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns workflow step details',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow step not found' })
  async getWorkflowStepById(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
  ): Promise<WorkflowResponse> {
    const step = await this.workflowsService.getWorkflowStepById(tenantId, workflowId, stepId);
    return WorkflowResponseFactory.success(
      step,
      'Step retrieved successfully',
      WorkflowStepOperationCode.STEP_RETRIEVED,
    );
  }

  @Put(':workflowId/steps/:stepId')
  @ApiOperation({ summary: 'Update workflow step' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow step updated successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow step not found' })
  @ApiResponse({ status: 409, description: 'Step order conflict' })
  async updateWorkflowStep(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
    @Body() updateStepDto: UpdateWorkflowStepDto,
  ): Promise<WorkflowResponse> {
    const step = await this.workflowsService.updateWorkflowStep(
      tenantId,
      workflowId,
      stepId,
      updateStepDto,
    );
    return WorkflowResponseFactory.updated(
      step,
      'Step updated successfully',
      WorkflowStepOperationCode.STEP_UPDATED,
    );
  }

  @Delete(':workflowId/steps/:stepId')
  @ApiOperation({ summary: 'Delete workflow step' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow step deleted successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow step not found' })
  async deleteWorkflowStep(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
  ): Promise<WorkflowResponse> {
    await this.workflowsService.deleteWorkflowStep(tenantId, workflowId, stepId);
    return WorkflowResponseFactory.deleted(
      'Step deleted successfully',
      WorkflowStepOperationCode.STEP_DELETED,
      { id: stepId },
    );
  }

  @Put(':workflowId/steps/reorder')
  @ApiOperation({ summary: 'Reorder workflow steps' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow steps reordered successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid step IDs' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async reorderWorkflowSteps(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Body(new ParseArrayPipe({ items: ReorderStepItemDto })) stepOrders: ReorderStepItemDto[],
  ): Promise<WorkflowResponse> {
    const steps = await this.workflowsService.reorderWorkflowSteps(
      tenantId,
      workflowId,
      stepOrders,
    );
    return WorkflowResponseFactory.updated(
      steps,
      `${steps.length} step(s) reordered successfully`,
      WorkflowStepOperationCode.STEPS_REORDERED,
    );
  }
}
