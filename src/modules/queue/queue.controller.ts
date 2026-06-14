import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import {
  CreateQueueDto,
  UpdateQueueDto,
  QueueQueryDto,
  AddToQueueDto,
  QueueItemQueryDto,
  AssignQueueItemDto,
  ReassignQueueItemDto,
  UpdateQueueItemStatusDto,
  AssignmentHistoryQueryDto,
} from './dto/queue.dto';
import { IdParamDto, LeadIdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CanCreate,
  CanRead,
  CanUpdate,
  CanDelete,
} from '../../common/decorators/permissions.decorator';
import { UseScope } from '../../common/decorators/scope.decorator';
import { UserScopes } from '../../common/decorators/user-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ModuleScopeMap } from '../../common/permissions/scope.service';

@ApiTags('Queue Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('queues')
export class QueueController {
  constructor(private queueService: QueueService) {}

  @Post()
  @CanCreate('queues')
  @ApiOperation({ summary: 'Create a new queue' })
  createQueue(@TenantId() tenantId: string, @Body() dto: CreateQueueDto) {
    return this.queueService.createQueue(tenantId, dto);
  }

  @Get()
  @CanRead('queues')
  @ApiOperation({ summary: 'Get all queues with item counts' })
  getAllQueues(@TenantId() tenantId: string, @Query() queryDto: QueueQueryDto) {
    return this.queueService.getAllQueues(tenantId, queryDto);
  }

  @Get('analytics')
  @CanRead('queues')
  @ApiOperation({ summary: 'Get overall queue analytics across all queues' })
  getOverallAnalytics(@TenantId() tenantId: string) {
    return this.queueService.getOverallAnalytics(tenantId);
  }

  @Get('assignment-history')
  @CanRead('queues')
  @UseScope('queues')
  @ApiOperation({ summary: 'Get assignment history with filtering' })
  getAssignmentHistory(
    @TenantId() tenantId: string,
    @Query() queryDto: AssignmentHistoryQueryDto,
    @UserScopes() userScopes: ModuleScopeMap,
    @CurrentUser() user: any,
  ) {
    return this.queueService.getAssignmentHistory(tenantId, queryDto, userScopes, user.id);
  }

  @Get('assignment-history/:id')
  @CanRead('queues')
  @UseScope('queues')
  @ApiOperation({ summary: 'Get assignment history by ID' })
  getAssignmentHistoryById(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @UserScopes() userScopes: ModuleScopeMap,
    @CurrentUser() user: any,
  ) {
    return this.queueService.getAssignmentHistoryById(tenantId, params.id, userScopes, user.id);
  }

  @Get(':id')
  @CanRead('queues')
  @ApiOperation({ summary: 'Get queue by ID with counts' })
  getQueueById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.queueService.getQueueById(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('queues')
  @ApiOperation({ summary: 'Update queue details' })
  updateQueue(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() dto: UpdateQueueDto,
  ) {
    return this.queueService.updateQueue(tenantId, params.id, dto);
  }

  @Delete(':id')
  @CanDelete('queues')
  @ApiOperation({ summary: 'Delete a queue and all its items' })
  deleteQueue(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.queueService.deleteQueue(tenantId, params.id);
  }

  @Get(':id/items')
  @CanRead('queues')
  @UseScope('queues')
  @ApiOperation({ summary: 'Get queue items with filtering' })
  getQueueItems(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Query() queryDto: QueueItemQueryDto,
    @UserScopes() userScopes: ModuleScopeMap,
    @CurrentUser() user: any,
  ) {
    return this.queueService.getQueueItems(tenantId, params.id, queryDto, userScopes, user.id);
  }

  @Get(':id/analytics')
  @CanRead('queues')
  @ApiOperation({ summary: 'Get analytics for a specific queue' })
  getQueueAnalytics(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.queueService.getQueueAnalytics(tenantId, params.id);
  }

  @Post(':id/items')
  @CanCreate('queues')
  @ApiOperation({ summary: 'Add a lead to the queue' })
  addToQueue(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() dto: AddToQueueDto,
  ) {
    return this.queueService.addToQueue(tenantId, params.id, dto);
  }

  @Post(':id/items/:itemId/assign')
  @CanUpdate('queues')
  @ApiOperation({ summary: 'Manually assign queue item to a staff member' })
  assignQueueItem(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto & { itemId: string },
    @Body() dto: AssignQueueItemDto,
  ) {
    return this.queueService.assignQueueItem(tenantId, params.itemId, dto);
  }

  @Post(':id/items/:itemId/auto-assign')
  @CanUpdate('queues')
  @ApiOperation({ summary: 'Auto-assign queue item using smart assignment engine' })
  autoAssignQueueItem(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto & { itemId: string },
  ) {
    return this.queueService.autoAssignQueueItem(tenantId, params.itemId);
  }

  @Post(':id/items/:itemId/reassign')
  @CanUpdate('queues')
  @ApiOperation({ summary: 'Reassign queue item to another staff member' })
  reassignQueueItem(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto & { itemId: string },
    @Body() dto: ReassignQueueItemDto,
  ) {
    return this.queueService.reassignQueueItem(tenantId, params.itemId, dto);
  }

  @Patch(':id/items/:itemId/status')
  @CanUpdate('queues')
  @UseScope('queues')
  @ApiOperation({ summary: 'Update queue item status' })
  updateQueueItemStatus(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto & { itemId: string },
    @Body() dto: UpdateQueueItemStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.queueService.updateQueueItemStatus(tenantId, params.itemId, dto, user.id);
  }

  @Get('items/:itemId')
  @CanRead('queues')
  @UseScope('queues')
  @ApiOperation({ summary: 'Get queue item details' })
  getQueueItemById(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @UserScopes() userScopes: ModuleScopeMap,
    @CurrentUser() user: any,
  ) {
    return this.queueService.getQueueItemById(tenantId, params.id, userScopes, user.id);
  }

  @Delete('items/:itemId')
  @CanUpdate('queues')
  @ApiOperation({ summary: 'Remove item from queue' })
  removeFromQueue(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.queueService.removeFromQueue(tenantId, params.id);
  }

  @Post('leads/:leadId/process-new')
  @CanCreate('queues')
  @ApiOperation({ summary: 'Process a new lead through the queue pipeline' })
  processNewLead(
    @TenantId() tenantId: string,
    @Param() params: LeadIdParamDto,
    @Query('queueId') queueId: string,
  ) {
    return this.queueService.processNewLead(tenantId, queueId, params.leadId);
  }

  @Post('leads/:leadId/revisit')
  @CanCreate('queues')
  @ApiOperation({ summary: 'Handle a revisit lead with continuity routing' })
  handleRevisitLead(@TenantId() tenantId: string, @Param() params: LeadIdParamDto) {
    return this.queueService.handleRevisitLead(tenantId, params.leadId);
  }

  @Get('leads/:leadId/assignment-history')
  @CanRead('queues')
  @UseScope('queues')
  @ApiOperation({ summary: 'Get assignment history for a specific lead' })
  getLeadAssignmentHistory(
    @TenantId() tenantId: string,
    @Param() params: LeadIdParamDto,
    @UserScopes() userScopes: ModuleScopeMap,
    @CurrentUser() user: any,
  ) {
    return this.queueService.getLeadAssignmentHistory(tenantId, params.leadId, userScopes, user.id);
  }
}
