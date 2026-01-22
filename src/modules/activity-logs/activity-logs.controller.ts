import {
  Controller,
  Get,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { PaginationDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityLogFilterDto, ActivityLogResponseDto } from './dto/activity-log.dto';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all activity logs with filtering',
    description: 'Retrieve activity logs for audit purposes with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
    type: [ActivityLogResponseDto],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  async getLogs(
    @Req() req: any,
    @Query() filterDto: ActivityLogFilterDto,
    @Query() paginationDto: PaginationDto,
  ) {
    const tenantId = req.tenantId;
    return this.activityLogsService.getLogs(tenantId, filterDto, paginationDto);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get activity statistics',
    description: 'Get aggregated statistics about activities in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity statistics retrieved successfully',
  })
  async getStats(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.activityLogsService.getActivityStats(tenantId);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({
    summary: 'Get activity logs for a specific entity',
    description: 'Retrieve all activity logs for a specific entity (e.g., all logs for a task)',
  })
  @ApiParam({ name: 'entityType', description: 'Type of entity (Task, Appointment, etc.)' })
  @ApiParam({ name: 'entityId', description: 'ID of the entity' })
  @ApiResponse({
    status: 200,
    description: 'Entity activity logs retrieved successfully',
    type: [ActivityLogResponseDto],
  })
  async getEntityLogs(
    @Req() req: any,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const tenantId = req.tenantId;
    return this.activityLogsService.getEntityLogs(
      tenantId,
      entityType,
      entityId,
      paginationDto,
    );
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get activity logs for a specific user',
    description: 'Retrieve all activities performed by a specific user',
  })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiResponse({
    status: 200,
    description: 'User activity logs retrieved successfully',
    type: [ActivityLogResponseDto],
  })
  async getUserLogs(
    @Req() req: any,
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const tenantId = req.tenantId;
    return this.activityLogsService.getUserLogs(tenantId, userId, paginationDto);
  }
}
