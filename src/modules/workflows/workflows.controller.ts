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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto, UpdateWorkflowDto, CreateWorkflowStepDto, UpdateWorkflowStepDto } from './dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../common/decorators/permissions.decorator';

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
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  @ApiResponse({ status: 404, description: 'Visa type not found' })
  createWorkflow(@TenantId() tenantId: string, @Body() createWorkflowDto: CreateWorkflowDto) {
    return this.workflowsService.createWorkflow(tenantId, createWorkflowDto);
  }

  @Get()
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get all workflows with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of workflows' })
  getAllWorkflows(@TenantId() tenantId: string, @Query() paginationDto: PaginationDto) {
    return this.workflowsService.getAllWorkflows(tenantId, paginationDto);
  }

  @Get('by-visa-type/:visaTypeId')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get workflows by visa type' })
  @ApiParam({ name: 'visaTypeId', description: 'Visa Type ID' })
  @ApiResponse({ status: 200, description: 'Returns list of workflows for the visa type' })
  @ApiResponse({ status: 404, description: 'Visa type not found' })
  getWorkflowsByVisaType(@TenantId() tenantId: string, @Param('visaTypeId') visaTypeId: string) {
    return this.workflowsService.getWorkflowsByVisaType(tenantId, visaTypeId);
  }

  @Get(':id')
  @CanRead('workflows')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Returns workflow details with steps' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  getWorkflowById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.workflowsService.getWorkflowById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('workflows')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  updateWorkflow(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.updateWorkflow(tenantId, params.id, updateWorkflowDto);
  }

  @Delete(':id')
  @CanDelete('workflows')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  deleteWorkflow(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.workflowsService.deleteWorkflow(tenantId, params.id);
  }

  // ============ Workflow Step Endpoints ============

  @Post(':workflowId/steps')
  @ApiOperation({ summary: 'Add step to workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 201, description: 'Workflow step created successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 409, description: 'Step order already exists' })
  addWorkflowStep(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Body() createStepDto: CreateWorkflowStepDto,
  ) {
    return this.workflowsService.addWorkflowStep(tenantId, workflowId, createStepDto);
  }

  @Get(':workflowId/steps')
  @ApiOperation({ summary: 'Get all steps for a workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Returns ordered list of workflow steps' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  getWorkflowSteps(@TenantId() tenantId: string, @Param('workflowId') workflowId: string) {
    return this.workflowsService.getWorkflowSteps(tenantId, workflowId);
  }

  @Get(':workflowId/steps/:stepId')
  @ApiOperation({ summary: 'Get workflow step by ID' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 200, description: 'Returns workflow step details' })
  @ApiResponse({ status: 404, description: 'Workflow step not found' })
  getWorkflowStepById(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
  ) {
    return this.workflowsService.getWorkflowStepById(tenantId, workflowId, stepId);
  }

  @Put(':workflowId/steps/:stepId')
  @ApiOperation({ summary: 'Update workflow step' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 200, description: 'Workflow step updated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow step not found' })
  @ApiResponse({ status: 409, description: 'Step order conflict' })
  updateWorkflowStep(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
    @Body() updateStepDto: UpdateWorkflowStepDto,
  ) {
    return this.workflowsService.updateWorkflowStep(tenantId, workflowId, stepId, updateStepDto);
  }

  @Delete(':workflowId/steps/:stepId')
  @ApiOperation({ summary: 'Delete workflow step' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 200, description: 'Workflow step deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow step not found' })
  deleteWorkflowStep(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
  ) {
    return this.workflowsService.deleteWorkflowStep(tenantId, workflowId, stepId);
  }

  @Put(':workflowId/steps/reorder')
  @ApiOperation({ summary: 'Reorder workflow steps' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Workflow steps reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid step IDs' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  reorderWorkflowSteps(
    @TenantId() tenantId: string,
    @Param('workflowId') workflowId: string,
    @Body() stepOrders: { id: string; order: number }[],
  ) {
    return this.workflowsService.reorderWorkflowSteps(tenantId, workflowId, stepOrders);
  }
}
