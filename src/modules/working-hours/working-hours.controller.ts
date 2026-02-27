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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { WorkingHoursService } from './working-hours.service';
import {
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
  BulkWorkingHoursDto,
  WorkingHoursQueryDto,
  WorkingHoursResponseDto,
  DayOfWeekEnum,
} from './dto/working-hours.dto';
import { IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CanCreate,
  CanRead,
  CanUpdate,
  CanDelete,
} from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Working Hours Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('working-hours')
export class WorkingHoursController {
  constructor(private workingHoursService: WorkingHoursService) {}

  @Post()
  @CanCreate('settings')
  @ApiOperation({ summary: 'Create working hours for a specific day' })
  @ApiResponse({
    status: 201,
    description: 'Working hours created successfully',
    type: WorkingHoursResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Working hours already exist for this day',
  })
  createWorkingHours(
    @TenantId() tenantId: string,
    @Body() createDto: CreateWorkingHoursDto,
  ) {
    return this.workingHoursService.create(tenantId, createDto);
  }

  @Get()
  @CanRead('settings')
  @ApiOperation({ summary: 'Get all working hours for tenant' })
  @ApiResponse({
    status: 200,
    description: 'Working hours retrieved successfully',
    type: [WorkingHoursResponseDto],
  })
  getAllWorkingHours(
    @TenantId() tenantId: string,
    @Query() queryDto: WorkingHoursQueryDto,
  ) {
    return this.workingHoursService.findAll(tenantId, queryDto);
  }

  @Get(':id')
  @CanRead('settings')
  @ApiOperation({ summary: 'Get working hours by ID' })
  @ApiResponse({
    status: 200,
    description: 'Working hours retrieved successfully',
    type: WorkingHoursResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Working hours not found' })
  getWorkingHoursById(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
  ) {
    return this.workingHoursService.findOne(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('settings')
  @ApiOperation({ summary: 'Update working hours' })
  @ApiResponse({
    status: 200,
    description: 'Working hours updated successfully',
    type: WorkingHoursResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation error' })
  @ApiResponse({ status: 404, description: 'Working hours not found' })
  updateWorkingHours(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() updateDto: UpdateWorkingHoursDto,
  ) {
    return this.workingHoursService.update(tenantId, params.id, updateDto);
  }

  @Post('bulk')
  @CanCreate('settings')
  @ApiOperation({
    summary: 'Bulk create/update working hours for all days of the week',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation completed',
    schema: {
      type: 'object',
      properties: {
        created: { type: 'number' },
        updated: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  bulkUpsertWorkingHours(
    @TenantId() tenantId: string,
    @Body() bulkDto: BulkWorkingHoursDto,
  ) {
    return this.workingHoursService.bulkUpsert(tenantId, bulkDto);
  }

  @Delete(':id')
  @CanDelete('settings')
  @ApiOperation({ summary: 'Delete working hours (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Working hours deleted successfully',
    type: WorkingHoursResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Working hours not found' })
  deleteWorkingHours(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
  ) {
    return this.workingHoursService.remove(tenantId, params.id);
  }
}
