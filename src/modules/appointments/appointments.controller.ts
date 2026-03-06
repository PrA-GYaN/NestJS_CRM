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
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentsQueryDto,
  ApproveAppointmentDto,
  RejectAppointmentDto,
  CompleteAppointmentDto,
  CheckAvailabilityDto,
  BookedSlotsQueryDto,
  CancelAppointmentDto,
  CreateAppointmentCrmDto,
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * APPOINTMENT MODULE – CRM (Staff Management) Controller
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## Appointment Creation Flows
 *
 * ### 1. Student Panel Flow (via /student-panel)
 *   Student → POST /student-panel/appointments/request
 *     • Status created: **Pending**
 *     • requestedBy:    Student
 *     • Staff receives a notification and must approve or reject.
 *   Staff → POST /appointments/:id/approve  → Status: **Booked**
 *   Staff → POST /appointments/:id/reject   → Status: **Rejected**
 *
 * ### 2. CRM Direct Flow (this controller)
 *   Staff → POST /appointments/create
 *     • Status created: **Booked** (no approval step required)
 *     • requestedBy:    Staff
 *     • Working hours and conflict checks still apply.
 *     • Requires permission: appointments:create
 *
 * ## Status State Machine
 *   Pending  ──approve──▶ Booked  ──complete──▶ Completed
 *   Pending  ──reject───▶ Rejected
 *   Pending  ──cancel───▶ Cancelled
 *   Booked   ──cancel───▶ Cancelled
 *   Booked   ──no-show──▶ NoShow
 *
 * ## Required Permissions
 *   • appointments:read   – view appointments, dashboard stats, availability
 *   • appointments:create – create appointments from CRM
 *   • appointments:update – approve / reject / complete / no-show / cancel
 *   • appointments:delete – hard-delete (legacy)
 * ─────────────────────────────────────────────────────────────────────────────
 */
@ApiTags('Appointments - CRM Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('appointments')
@ApiExtraModels(
  AppointmentResponseDto,
  PaginatedAppointmentsResponseDto,
  AvailabilityResponseDto,
  StaffDashboardStatsDto,
)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // CRM APPOINTMENT CREATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Staff creates an appointment directly from the CRM.
   *
   * Key differences from the Student Panel flow:
   *   - Appointment is immediately set to **Booked** (no Pending / approval step).
   *   - requestedBy is set to **Staff**.
   *   - staffId defaults to the authenticated user; can be overridden to
   *     assign the appointment to a different staff member.
   *
   * Validations applied:
   *   - scheduledAt must be ≥ 15 minutes in the future.
   *   - duration must be 15–120 minutes in 15-minute increments.
   *   - scheduledAt and endTime must fall within the tenant's configured working hours.
   *   - No existing Booked appointment may overlap the requested slot for the assigned staff.
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @CanCreate('appointments')
  @ApiOperation({
    summary: 'CRM – Create appointment directly (Booked, no approval needed)',
    description:
      'Allows a staff member with the **appointments:create** permission to schedule an appointment on behalf of a student directly from the CRM. ' +
      'The appointment bypasses the Pending/approval queue and is created in **Booked** status immediately. ' +
      'Working-hours validation and conflict detection still apply.\n\n' +
      '**Use this endpoint when a staff member proactively arranges a meeting with a student.**\n\n' +
      '**Workflow:** Staff creates → status = Booked → staff completes or marks no-show after the meeting.',
  })
  @ApiBody({
    type: CreateAppointmentCrmDto,
    description: 'Appointment details',
    examples: {
      minimal: {
        summary: 'Minimal (assign to self)',
        value: {
          studentId: '550e8400-e29b-41d4-a716-446655440000',
          scheduledAt: '2026-03-15T10:00:00Z',
          duration: 60,
        },
      },
      full: {
        summary: 'Full example (assign to another staff)',
        value: {
          studentId: '550e8400-e29b-41d4-a716-446655440000',
          staffId: '660e8400-e29b-41d4-a716-446655440001',
          scheduledAt: '2026-03-15T10:00:00Z',
          duration: 60,
          purpose: 'Initial counseling session – university shortlisting',
          note: 'Bring all required documents.',
          notes: 'Student is applying for UK September 2026 intake.',
          staffNotes: 'Review IELTS score before the meeting.',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Appointment created and immediately Booked.',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error – duration out of range, not a 15-minute increment, time in the past, or outside working hours.',
  })
  @ApiResponse({
    status: 404,
    description: 'Student or assigned staff member not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict – the assigned staff already has a Booked appointment overlapping the requested slot.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Staff already has a booked appointment during this time',
        conflictingAppointment: {
          id: 'uuid',
          scheduledAt: '2026-03-15T10:00:00Z',
          endTime: '2026-03-15T11:00:00Z',
          status: 'Booked',
        },
      },
    },
  })
  createAppointmentCrm(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateAppointmentCrmDto,
  ) {
    return this.appointmentsService.createAppointmentByCrm(
      tenantId,
      createDto,
      user.id,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // QUERYING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Returns all appointments for the tenant, supporting rich filtering.
   * Useful for CRM dashboards and reporting views.
   */
  @Get()
  @CanRead('appointments')
  @ApiOperation({
    summary: 'List all appointments (with filters)',
    description:
      'Returns a paginated list of all appointments for the tenant. ' +
      'Supports filtering by status, date range, staff member, and student. ' +
      'Results are ordered by `scheduledAt` descending by default.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Booked', 'Rejected', 'Scheduled', 'Completed', 'Cancelled', 'NoShow'], description: 'Filter by appointment status' })
  @ApiQuery({ name: 'staffId', required: false, type: String, description: 'Filter by assigned staff member UUID' })
  @ApiQuery({ name: 'studentId', required: false, type: String, description: 'Filter by student UUID' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Exact date filter (YYYY-MM-DD) – takes precedence over from/to' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Range start (ISO 8601). Example: 2026-03-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'Range end (ISO 8601). Example: 2026-03-31T23:59:59Z' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 10)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated appointment list.',
    type: PaginatedAppointmentsResponseDto,
  })
  getAllAppointments(
    @TenantId() tenantId: string,
    @Query() queryDto: AppointmentsQueryDto,
  ) {
    return this.appointmentsService.findAll(tenantId, queryDto);
  }

  /**
   * Returns appointments awaiting staff approval.
   * Use this to power the CRM approval queue / inbox.
   */
  @Get('pending')
  @CanRead('appointments')
  @ApiOperation({
    summary: 'Get pending appointment requests (approval queue)',
    description:
      'Returns all appointments with status **Pending**, i.e. student requests that have not yet been approved or rejected. ' +
      'Staff should regularly monitor this queue and process each request using the approve or reject endpoints. ' +
      'Supports the same filter and pagination parameters as the main list endpoint.',
  })
  @ApiQuery({ name: 'staffId', required: false, type: String, description: 'Filter pending requests for a specific staff member' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Range start (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'Range end (ISO 8601)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Pending appointments retrieved successfully.',
    type: PaginatedAppointmentsResponseDto,
  })
  getPendingAppointments(
    @TenantId() tenantId: string,
    @Query() queryDto: AppointmentsQueryDto,
  ) {
    return this.appointmentsService.getPendingAppointments(tenantId, queryDto);
  }

  /**
   * Returns appointments assigned to a specific staff member.
   */
  @Get('staff/:staffId')
  @CanRead('appointments')
  @ApiOperation({
    summary: 'Get appointments for a specific staff member',
    description:
      'Returns a paginated list of all appointments (any status) for the given staff member. ' +
      'Useful for rendering a staff member\'s calendar or schedule. ' +
      'Combine with the `status`, `date`, `from`, and `to` query parameters to narrow results.',
  })
  @ApiParam({ name: 'staffId', description: 'UUID of the staff member', type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Booked', 'Rejected', 'Completed', 'Cancelled', 'NoShow'] })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Single-day filter (YYYY-MM-DD)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Staff appointments retrieved successfully.',
    type: PaginatedAppointmentsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Staff member not found.' })
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

  /**
   * Returns KPI summary cards for the staff member's dashboard.
   */
  @Get('staff/:staffId/dashboard-stats')
  @CanRead('appointments')
  @ApiOperation({
    summary: 'Get dashboard KPIs for a staff member',
    description:
      'Returns aggregated statistics for a staff member\'s appointment dashboard:\n' +
      '- `pendingApprovals` – number of student requests awaiting action\n' +
      '- `todayAppointments` – Booked appointments scheduled for today\n' +
      '- `upcomingWeekAppointments` – Booked appointments in the next 7 days\n' +
      '- `completionRate` – percentage of completed vs (completed + no-show)\n' +
      '- `averageAppointmentDuration` – mean duration in minutes\n' +
      '- `nextAppointment` – the next upcoming Booked appointment (nullable)',
  })
  @ApiParam({ name: 'staffId', description: 'UUID of the staff member', type: String })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully.',
    type: StaffDashboardStatsDto,
  })
  getStaffDashboardStats(
    @TenantId() tenantId: string,
    @Param('staffId') staffId: string,
  ) {
    return this.appointmentsService.getStaffDashboardStats(tenantId, staffId);
  }

  /**
   * Returns a single appointment by its UUID.
   */
  @Get(':id')
  @CanRead('appointments')
  @ApiOperation({
    summary: 'Get appointment by ID',
    description:
      'Returns the full appointment object for the given UUID, including nested `staff` and `student` objects. ' +
      'Returns 404 if the appointment does not exist in this tenant.',
  })
  @ApiParam({ name: 'id', description: 'Appointment UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Appointment retrieved successfully.',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  getAppointmentById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.appointmentsService.findOne(tenantId, params.id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AVAILABILITY & SCHEDULING HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Checks whether a specific time slot is available for a staff member.
   * Call this before creating an appointment to avoid conflicts.
   */
  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @CanRead('appointments')
  @ApiOperation({
    summary: 'Check availability for a time slot',
    description:
      'Validates whether the requested time slot is:\n' +
      '1. Within the tenant\'s configured working hours for that day.\n' +
      '2. Free of conflicting Booked appointments for the specified staff member.\n\n' +
      'Returns `available: true` if both conditions are met. ' +
      'If unavailable, the response includes a `reason` (`OUTSIDE_WORKING_HOURS` | `STAFF_CONFLICT`) ' +
      'and the list of conflicting appointments or the working-hours config.',
  })
  @ApiBody({
    type: CheckAvailabilityDto,
    examples: {
      example: {
        summary: 'Check a 1-hour slot',
        value: {
          staffId: '660e8400-e29b-41d4-a716-446655440001',
          scheduledAt: '2026-03-15T10:00:00Z',
          duration: 60,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Availability result returned.',
    type: AvailabilityResponseDto,
    schema: {
      examples: {
        available: {
          summary: 'Slot is free',
          value: {
            available: true,
            scheduledAt: '2026-03-15T10:00:00Z',
            duration: 60,
            endTime: '2026-03-15T11:00:00Z',
            withinWorkingHours: true,
            conflicts: [],
          },
        },
        conflict: {
          summary: 'Slot is taken',
          value: {
            available: false,
            scheduledAt: '2026-03-15T10:00:00Z',
            duration: 60,
            endTime: '2026-03-15T11:00:00Z',
            withinWorkingHours: true,
            reason: 'STAFF_CONFLICT',
            conflicts: [
              {
                id: 'uuid',
                scheduledAt: '2026-03-15T10:00:00Z',
                endTime: '2026-03-15T11:00:00Z',
                status: 'Booked',
              },
            ],
          },
        },
      },
    },
  })
  checkAvailability(
    @TenantId() tenantId: string,
    @Body() checkDto: CheckAvailabilityDto,
  ) {
    return this.appointmentsService.checkAvailability(tenantId, checkDto);
  }

  /**
   * Returns all occupied time slots for a staff member in a date range.
   * Use this to render a booking calendar with greyed-out unavailable times.
   */
  @Post('booked-slots')
  @HttpCode(HttpStatus.OK)
  @CanRead('appointments')
  @ApiOperation({
    summary: 'Get occupied slots for a staff member (calendar helper)',
    description:
      'Returns all **Pending** and **Booked** appointments for the specified staff member ' +
      'within the given date range. The response is a lightweight array of slot objects ' +
      '(id, scheduledAt, endTime, duration, status) intended for rendering a booking calendar. ' +
      'Both Pending and Booked slots should be treated as unavailable.',
  })
  @ApiBody({
    type: BookedSlotsQueryDto,
    examples: {
      example: {
        summary: 'Slots for March 2026',
        value: {
          staffId: '660e8400-e29b-41d4-a716-446655440001',
          from: '2026-03-01T00:00:00Z',
          to: '2026-03-31T23:59:59Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Booked slots retrieved successfully.',
    schema: {
      example: [
        {
          id: 'uuid',
          scheduledAt: '2026-03-15T10:00:00Z',
          endTime: '2026-03-15T11:00:00Z',
          duration: 60,
          status: 'Booked',
        },
      ],
    },
  })
  getBookedSlots(
    @TenantId() tenantId: string,
    @Body() queryDto: BookedSlotsQueryDto,
  ) {
    return this.appointmentsService.getBookedSlots(tenantId, queryDto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // APPROVAL WORKFLOW (Student Panel Requests)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Approves a student's Pending appointment request.
   * Uses optimistic locking to prevent double-booking race conditions.
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @CanUpdate('appointments')
  @ApiOperation({
    summary: 'Approve a pending appointment request',
    description:
      'Transitions the appointment from **Pending** → **Booked**. ' +
      'This endpoint uses optimistic locking (version field) to prevent race conditions ' +
      'where two staff members approve the same slot simultaneously. ' +
      'A conflict check is re-run at approval time; if another appointment was booked in ' +
      'the interim, a 409 Conflict is returned.\n\n' +
      '**Only applicable to requests created via the Student Panel flow (requestedBy: Student).**',
  })
  @ApiParam({ name: 'id', description: 'UUID of the appointment to approve', type: String })
  @ApiBody({
    type: ApproveAppointmentDto,
    examples: {
      withNotes: {
        summary: 'Approve with internal notes',
        value: { staffNotes: 'Will prepare Stanford application materials beforehand.' },
      },
      minimal: {
        summary: 'Approve without notes',
        value: {},
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment approved – status is now Booked.',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request – appointment is not in Pending status.',
    schema: { example: { statusCode: 400, message: 'Cannot approve appointment with status: Booked' } },
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict – another appointment was booked in the same slot while this approval was being processed.',
    schema: {
      example: {
        statusCode: 409,
        error: 'APPROVAL_CONFLICT',
        message: 'Another appointment was approved during this time',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
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

  /**
   * Rejects a student's Pending appointment request with a reason.
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @CanUpdate('appointments')
  @ApiOperation({
    summary: 'Reject a pending appointment request',
    description:
      'Transitions the appointment from **Pending** → **Rejected**. ' +
      'The `rejectionReason` is recorded and is visible to the student. ' +
      'Only Pending appointments can be rejected.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the appointment to reject', type: String })
  @ApiBody({
    type: RejectAppointmentDto,
    examples: {
      example: {
        summary: 'Reject with reason',
        value: { rejectionReason: 'Not available at this time. Please choose another slot.' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment rejected – status is now Rejected.',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request – appointment is not in Pending status.',
  })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
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

  // ──────────────────────────────────────────────────────────────────────────
  // POST-MEETING ACTIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Marks a Booked appointment as completed and records outcome notes.
   * Can only be performed by the staff member assigned to the appointment.
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @CanUpdate('appointments')
  @ApiOperation({
    summary: 'Mark appointment as completed',
    description:
      'Transitions the appointment from **Booked** → **Completed**. ' +
      'Can only be performed **after** the scheduled time has passed. ' +
      'Only the assigned staff member can complete the appointment. ' +
      'Optional `outcomeNotes` should summarise what was discussed or decided.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the appointment to complete', type: String })
  @ApiBody({
    type: CompleteAppointmentDto,
    examples: {
      example: {
        summary: 'Complete with outcome notes',
        value: {
          outcomeNotes:
            'Reviewed Stanford application. Recommended improvements to personal statement. Follow-up session scheduled.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment marked as Completed.',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request – appointment is not Booked, or scheduled time has not yet passed.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden – only the assigned staff member can complete this appointment.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
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

  /**
   * Marks a Booked appointment as no-show when the student did not attend.
   * Can only be performed after the scheduled time has passed.
   */
  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @CanUpdate('appointments')
  @ApiOperation({
    summary: 'Mark appointment as no-show',
    description:
      'Transitions the appointment from **Booked** → **NoShow**. ' +
      'Can only be performed after the scheduled time has passed. ' +
      'Only the assigned staff member can mark their own appointments as no-show. ' +
      'No-shows are counted in the completion-rate KPI.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the appointment', type: String })
  @ApiResponse({
    status: 200,
    description: 'Appointment marked as NoShow.',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request – appointment is not Booked, or scheduled time has not yet passed.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden – only the assigned staff member can perform this action.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  markAppointmentNoShow(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
  ) {
    return this.appointmentsService.markNoShow(tenantId, params.id, user.id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CANCELLATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Cancels any Pending or Booked appointment from the CRM side.
   * Staff can cancel appointments regardless of who originally created them.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @CanUpdate('appointments')
  @ApiOperation({
    summary: 'Cancel an appointment (staff)',
    description:
      'Transitions the appointment from **Pending** or **Booked** → **Cancelled**. ' +
      'A `cancellationReason` is required and will be recorded for audit purposes. ' +
      'Staff can cancel any appointment in this tenant without ownership restriction. ' +
      'Appointments in Completed, Cancelled, Rejected, or NoShow status cannot be cancelled.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the appointment to cancel', type: String })
  @ApiBody({
    type: CancelAppointmentDto,
    examples: {
      example: {
        summary: 'Cancel with reason',
        value: { cancellationReason: 'Staff unavailable – emergency situation.' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled successfully.',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request – appointment is in a terminal status and cannot be cancelled.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Cannot cancel appointment with status: Completed',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  cancelAppointment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
    @Body() cancelDto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancel(
      tenantId,
      params.id,
      cancelDto,
      user.id,
      'staff',
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LEGACY ENDPOINTS (kept for backward compatibility)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * @deprecated Use POST /appointments/create instead.
   */
  @Post()
  @CanCreate('appointments')
  @ApiOperation({
    summary: '[DEPRECATED] Create appointment (legacy – unvalidated)',
    description:
      '⚠️ **Deprecated.** This endpoint accepts an arbitrary JSON body without validation and ' +
      'does not enforce working-hours or conflict checks. ' +
      'Use **POST /appointments/create** for CRM staff creation.',
  })
  createAppointmentLegacy(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() data: any,
  ) {
    return this.appointmentsService.createAppointment(tenantId, data, user.id);
  }

  /**
   * @deprecated Use action-specific endpoints (approve/reject/cancel/complete) instead.
   */
  @Put(':id')
  @CanUpdate('appointments')
  @ApiOperation({
    summary: '[DEPRECATED] Update appointment (legacy – unvalidated)',
    description:
      '⚠️ **Deprecated.** Use the specific action endpoints (approve, reject, cancel, complete) instead.',
  })
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

  /**
   * @deprecated Prefer cancelling via POST /appointments/:id/cancel.
   */
  @Delete(':id')
  @CanDelete('appointments')
  @ApiOperation({
    summary: '[DEPRECATED] Delete appointment (legacy hard-delete)',
    description:
      '⚠️ **Deprecated.** Hard-deletes the appointment record. ' +
      'Prefer using **POST /appointments/:id/cancel** to preserve audit history.',
  })
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


