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
import { AppointmentsService } from './appointments.service';
import {
  AppointmentsQueryDto,
  ApproveAppointmentDto,
  RejectAppointmentDto,
  CompleteAppointmentDto,
  CheckAvailabilityDto,
  PaginatedAppointmentsResponseDto,
  AppointmentResponseDto,
  AvailabilityResponseDto,
  StaffDashboardStatsDto,
} from './dto/appointment.dto';
import { PaginationDto, IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CanCreate,
  CanRead,
  CanUpdate,
  CanDelete,
} from '../../common/decorators/permissions.decorator';

@ApiTags('Appointments - Staff Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Get('pending')
  @CanRead('appointments')
  @ApiOperation({ summary: 'Get pending appointment requests' })
  @ApiResponse({
    status: 200,
    description: 'Pending appointments retrieved successfully',
    type: PaginatedAppointmentsResponseDto,
  })
  getPendingAppointments(
    @TenantId() tenantId: string,
    @Query() queryDto: AppointmentsQueryDto,
  ) {
    return this.appointmentsService.getPendingAppointments(tenantId, queryDto);
  }

  @Get('staff/:staffId')
  @CanRead('appointments')
  @ApiOperation({ summary: 'Get appointments for a specific staff member' })
  @ApiResponse({
    status: 200,
    description: 'Staff appointments retrieved successfully',
    type: PaginatedAppointmentsResponseDto,
  })
  getStaffAppointments(
    @TenantId() tenantId: string,
    @Param('staffId') staffId: string,
    @Query() queryDto: AppointmentsQueryDto,
  ) {
    return this.appointmentsService.getStaffAppointments(
      tenantId,
      staffId,
      queryDto,
    );
  }

  @Get('staff/:staffId/dashboard-stats')
  @CanRead('appointments')
  @ApiOperation({ summary: 'Get dashboard statistics for a staff member' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully',
    type: StaffDashboardStatsDto,
  })
  getStaffDashboardStats(
    @TenantId() tenantId: string,
    @Param('staffId') staffId: string,
  ) {
    return this.appointmentsService.getStaffDashboardStats(tenantId, staffId);
  }

  @Post('check-availability')
  @CanRead('appointments')
  @ApiOperation({
    summary: 'Check availability for a specific time slot',
  })
  @ApiResponse({
    status: 200,
    description: 'Availability checked successfully',
    type: AvailabilityResponseDto,
  })
  checkAvailability(
    @TenantId() tenantId: string,
    @Body() checkDto: CheckAvailabilityDto,
  ) {
    return this.appointmentsService.checkAvailability(tenantId, checkDto);
  }

  @Post(':id/approve')
  @CanUpdate('appointments')
  @ApiOperation({
    summary: 'Approve a pending appointment request',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment approved successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid status transition',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Time slot no longer available',
  })
  approveAppointment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
    @Body() approveDto: ApproveAppointmentDto,
  ) {
    return this.appointmentsService.approve(
      tenantId,
      params.id,
      approveDto,
      user.id,
    );
  }

  @Post(':id/reject')
  @CanUpdate('appointments')
  @ApiOperation({ summary: 'Reject a pending appointment request' })
  @ApiResponse({
    status: 200,
    description: 'Appointment rejected successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid status transition',
  })
  rejectAppointment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
    @Body() rejectDto: RejectAppointmentDto,
  ) {
    return this.appointmentsService.reject(
      tenantId,
      params.id,
      rejectDto,
      user.id,
    );
  }

  @Post(':id/complete')
  @CanUpdate('appointments')
  @ApiOperation({ summary: 'Mark appointment as completed' })
  @ApiResponse({
    status: 200,
    description: 'Appointment marked as completed',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Cannot complete future appointment',
  })
  completeAppointment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
    @Body() completeDto: CompleteAppointmentDto,
  ) {
    return this.appointmentsService.complete(
      tenantId,
      params.id,
      completeDto,
      user.id,
    );
  }

  @Post(':id/no-show')
  @CanUpdate('appointments')
  @ApiOperation({ summary: 'Mark appointment as no-show' })
  @ApiResponse({
    status: 200,
    description: 'Appointment marked as no-show',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Cannot mark future appointment as no-show',
  })
  markAppointmentNoShow(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
  ) {
    return this.appointmentsService.markNoShow(tenantId, params.id, user.id);
  }

  // Legacy endpoints for backward compatibility
  @Post()
  @CanCreate('appointments')
  @ApiOperation({ summary: 'Create appointment (legacy)' })
  createAppointment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() data: any,
  ) {
    return this.appointmentsService.createAppointment(tenantId, data, user.id);
  }

  @Get()
  @CanRead('appointments')
  @ApiOperation({ summary: 'Get all appointments' })
  @ApiResponse({
    status: 200,
    description: 'Appointments retrieved successfully',
    type: PaginatedAppointmentsResponseDto,
  })
  getAllAppointments(
    @TenantId() tenantId: string,
    @Query() queryDto: AppointmentsQueryDto,
  ) {
    return this.appointmentsService.findAll(tenantId, queryDto);
  }

  @Get(':id')
  @CanRead('appointments')
  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Appointment retrieved successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  getAppointmentById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.appointmentsService.findOne(tenantId, params.id);
  }

  @Put(':id')
  @CanUpdate('appointments')
  @ApiOperation({ summary: 'Update appointment (legacy)' })
  updateAppointment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
    @Body() data: any,
  ) {
    return this.appointmentsService.updateAppointment(
      tenantId,
      params.id,
      data,
      user.id,
    );
  }

  @Delete(':id')
  @CanDelete('appointments')
  @ApiOperation({ summary: 'Delete appointment (legacy)' })
  deleteAppointment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
  ) {
    return this.appointmentsService.deleteAppointment(
      tenantId,
      params.id,
      user.id,
    );
  }
}

