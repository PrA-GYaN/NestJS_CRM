import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import {
  CreateStaffProfileDto,
  UpdateStaffProfileDto,
  StaffQueryDto,
  StaffStatusEnum,
  StaffDashboardQueryDto,
} from './dto/staff.dto';
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Staff Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('staff')
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Post('profiles')
  @CanCreate('staff')
  @ApiOperation({ summary: 'Create staff profile for an existing user' })
  createProfile(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateStaffProfileDto,
  ) {
    return this.staffService.createProfile(tenantId, dto, user.id);
  }

  @Get('profiles')
  @CanRead('staff')
  @ApiOperation({ summary: 'Get all staff profiles with filtering' })
  getAllProfiles(@TenantId() tenantId: string, @Query() queryDto: StaffQueryDto) {
    return this.staffService.getAllProfiles(tenantId, queryDto);
  }

  @Get('workload')
  @CanRead('staff')
  @ApiOperation({ summary: 'Get workload for all staff or a specific staff member' })
  @ApiQuery({ name: 'staffId', required: false, type: String })
  getWorkload(@TenantId() tenantId: string, @Query('staffId') staffId?: string) {
    return this.staffService.getWorkload(tenantId, staffId);
  }

  @Get('available')
  @CanRead('staff')
  @ApiOperation({ summary: 'Get available counselors for assignment' })
  getAvailableCounselors(@TenantId() tenantId: string) {
    return this.staffService.getAvailableCounselors(tenantId);
  }

  @Get('stats')
  @CanRead('staff')
  @ApiOperation({ summary: 'Get staff statistics and distribution' })
  getStaffStats(@TenantId() tenantId: string) {
    return this.staffService.getStaffStats(tenantId);
  }

  @Get('profiles/by-user/:id')
  @CanRead('staff')
  @ApiOperation({ summary: 'Get staff profile by user ID' })
  getProfileByUserId(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.staffService.getProfileByUserId(tenantId, params.id);
  }

  @Get('profiles/:id')
  @CanRead('staff')
  @ApiOperation({ summary: 'Get staff profile by ID' })
  getProfileById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.staffService.getProfileById(tenantId, params.id);
  }

  @Put('profiles/:id')
  @CanUpdate('staff')
  @ApiOperation({ summary: 'Update staff profile' })
  updateProfile(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body() dto: UpdateStaffProfileDto,
  ) {
    return this.staffService.updateProfile(tenantId, params.id, dto);
  }

  @Patch('profiles/:id/status')
  @CanUpdate('staff')
  @ApiOperation({ summary: 'Update staff status (Available, Busy, OnLeave, Offline)' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param() params: IdParamDto,
    @Body('status') status: StaffStatusEnum,
  ) {
    return this.staffService.updateStatus(tenantId, params.id, status);
  }

  @Delete('profiles/:id')
  @CanDelete('staff')
  @ApiOperation({ summary: 'Delete staff profile' })
  deleteProfile(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.staffService.deleteProfile(tenantId, params.id);
  }

  @Get('counselor/dashboard')
  @CanRead('staff')
  @ApiOperation({ summary: 'Get counselor dashboard with consolidated visibility' })
  async getCounselorDashboard(
    @TenantId() tenantId: string,
    @Query() queryDto: StaffDashboardQueryDto,
    @CurrentUser() user: any,
  ) {
    const staffId =
      queryDto.staffId || (await this.staffService.getProfileByUserId(tenantId, user.id)).id;
    return this.staffService.getCounselorDashboard(tenantId, staffId);
  }
}
