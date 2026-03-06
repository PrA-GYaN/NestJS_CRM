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
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { StudentPanelService } from './student-panel.service';
import { AppointmentsService } from '../appointments/appointments.service';
import {
  UpdateStudentProfileDto,
  ChangePasswordDto,
  UploadStudentDocumentDto,
  CreateCourseApplicationDto,
  UpdateCourseApplicationDto,
  StudentApplicationsQueryDto,
  DocumentsQueryDto,
  NotificationsQueryDto,
  MarkNotificationReadDto,
  DashboardStatsResponseDto,
} from './dto/student-panel.dto';
import {
  CreateAppointmentRequestDto,
  CancelAppointmentDto,
  CheckAvailabilityDto,
  AppointmentsQueryDto,
} from '../appointments/dto/appointment.dto';
import { IdParamDto } from '../../common/dto/common.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Student Panel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('student-panel')
export class StudentPanelController {
  constructor(
    private studentPanelService: StudentPanelService,
    private appointmentsService: AppointmentsService,
  ) {}

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  @Get('profile')
  @ApiOperation({
    summary: 'Get my student profile',
    description: 'Returns the full student profile for the authenticated student, including academic records, test scores, and identification documents.',
  })
  @ApiResponse({ status: 200, description: 'Student profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Missing or invalid student JWT' })
  getMyProfile(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.studentPanelService.getMyProfile(tenantId, user.studentId || user.id);
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update my student profile',
    description: 'Updates editable profile fields. Students cannot change their email — contact a counsellor for email updates.',
  })
  @ApiBody({ type: UpdateStudentProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  updateMyProfile(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateStudentProfileDto,
  ) {
    return this.studentPanelService.updateMyProfile(tenantId, user.studentId || user.id, updateDto);
  }

  @Post('profile/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change my password',
    description: 'Changes the student account password. New password must be at least 8 characters and contain uppercase, lowercase, and a number or special character.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect or new password does not meet requirements' })
  changePassword(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.studentPanelService.changePassword(tenantId, user.studentId || user.id, changePasswordDto);
  }

  // ============================================
  // DASHBOARD
  // ============================================

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Returns aggregated KPIs for the student dashboard: application counts, pending tasks, upcoming appointments, unread notifications, and profile completeness score.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully', type: DashboardStatsResponseDto })
  getDashboardStats(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.studentPanelService.getDashboardStats(tenantId, user.studentId || user.id);
  }

  // ============================================
  // DOCUMENTS
  // ============================================

  @Get('documents')
  @ApiOperation({
    summary: 'Get my documents',
    description: 'Lists all documents uploaded by the student. Filter by document type (Passport, Transcript, VisaForm, etc.) or verification status.',
  })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  getMyDocuments(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query() queryDto: DocumentsQueryDto,
  ) {
    return this.studentPanelService.getMyDocuments(tenantId, user.studentId || user.id, queryDto);
  }

  @Post('documents')
  @ApiOperation({
    summary: 'Upload a document',
    description: 'Registers a new document record for the student. The `filePath` should be the URL or path returned by the File Management upload endpoint.',
  })
  @ApiBody({ type: UploadStudentDocumentDto })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  uploadDocument(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() uploadDto: UploadStudentDocumentDto,
  ) {
    return this.studentPanelService.uploadDocument(tenantId, user.studentId || user.id, uploadDto);
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  getDocumentById(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
  ) {
    return this.studentPanelService.getDocumentById(tenantId, user.studentId || user.id, params.id);
  }

  // ============================================
  // COURSE APPLICATIONS
  // ============================================

  @Get('applications')
  @ApiOperation({
    summary: 'Get my course applications',
    description: 'Returns a paginated list of the student\'s course applications. Filter by status (Draft, Submitted, UnderReview, Shortlisted, OfferReceived, Accepted, Rejected, Withdrawn).',
  })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  getMyCourseApplications(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query() queryDto: StudentApplicationsQueryDto,
  ) {
    return this.studentPanelService.getMyCourseApplications(tenantId, user.studentId || user.id, queryDto);
  }

  @Post('applications')
  @ApiOperation({
    summary: 'Create a new course application',
    description: 'Creates a course application in Draft status. Requires a valid `courseId` and `universityId`. Submit or update the application after creation.',
  })
  @ApiBody({ type: CreateCourseApplicationDto })
  @ApiResponse({ status: 201, description: 'Application created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid courseId or universityId' })
  createCourseApplication(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateCourseApplicationDto,
  ) {
    return this.studentPanelService.createCourseApplication(tenantId, user.studentId || user.id, createDto);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get course application by ID' })
  @ApiResponse({ status: 200, description: 'Application retrieved successfully' })
  getCourseApplicationById(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
  ) {
    return this.studentPanelService.getCourseApplicationById(tenantId, user.studentId || user.id, params.id);
  }

  @Put('applications/:id')
  @ApiOperation({ summary: 'Update course application (draft only)' })
  @ApiResponse({ status: 200, description: 'Application updated successfully' })
  updateCourseApplication(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
    @Body() updateDto: UpdateCourseApplicationDto,
  ) {
    return this.studentPanelService.updateCourseApplication(tenantId, user.studentId || user.id, params.id, updateDto);
  }

  @Post('applications/:id/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw course application' })
  @ApiResponse({ status: 200, description: 'Application withdrawn successfully' })
  withdrawApplication(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
  ) {
    return this.studentPanelService.withdrawApplication(tenantId, user.studentId || user.id, params.id);
  }

  // ============================================
  // APPOINTMENTS
  // ============================================

  /**
   * Student requests a new appointment.
   *
   * Workflow:
   *   1. Student submits this request → status = Pending
   *   2. Staff receives a notification and reviews the request in the CRM.
   *   3. Staff approves (POST /appointments/:id/approve) → Booked
   *      OR rejects (POST /appointments/:id/reject) → Rejected.
   *   4. After the meeting, staff marks it Completed or NoShow.
   *
   * Validation rules:
   *   - scheduledAt must be at least 1 hour in the future.
   *   - duration must be 15–120 minutes and a multiple of 15.
   *   - scheduledAt and endTime must fall within the tenant's working hours.
   *   - No Booked appointment may overlap the slot for the selected staff member.
   *   - If staffId is omitted, the system auto-assigns an available staff member.
   */
  @Post('appointments/request')
  @ApiOperation({
    summary: 'Request a new appointment (Student Panel)',
    description:
      'Allows an authenticated student to submit an appointment request to a staff/counselor. ' +
      'The appointment is created with status **Pending** and the assigned staff member receives a notification. ' +
      'Staff must then **approve** or **reject** the request from the CRM.\n\n' +
      '**Status flow:** Pending → Booked (staff approves) | Rejected (staff rejects) | Cancelled (student/staff cancels)',
  })
  @ApiBody({
    type: CreateAppointmentRequestDto,
    examples: {
      minimal: {
        summary: 'Minimal (auto-assign staff)',
        value: {
          scheduledAt: '2026-03-15T10:00:00Z',
          duration: 60,
          timezone: 'Asia/Kathmandu',
        },
      },
      full: {
        summary: 'Full example with preferred staff',
        value: {
          staffId: '660e8400-e29b-41d4-a716-446655440001',
          scheduledAt: '2026-03-15T10:00:00Z',
          duration: 60,
          timezone: 'Asia/Kathmandu',
          purpose: 'University Application Discussion',
          notes: 'I need help with my Stanford application and visa process.',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Appointment request created with status Pending. Staff will review and approve or reject.',
    schema: {
      example: {
        id: 'uuid',
        studentId: 'student-uuid',
        staffId: 'staff-uuid',
        scheduledAt: '2026-03-15T10:00:00Z',
        endTime: '2026-03-15T11:00:00Z',
        duration: 60,
        timezone: 'Asia/Kathmandu',
        purpose: 'University Application Discussion',
        status: 'Pending',
        requestedBy: 'Student',
        requestedAt: '2026-03-06T08:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error – invalid duration, time in the past, or outside working hours.' })
  @ApiResponse({ status: 404, description: 'Specified staff member not found.' })
  @ApiResponse({ status: 409, description: 'Time slot conflict – the staff already has a Booked appointment overlapping this slot.' })
  async requestAppointment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateAppointmentRequestDto,
  ) {
    return this.appointmentsService.createAppointmentRequest(
      tenantId,
      user.studentId || user.id,
      dto,
    );
  }

  @Get('appointments')
  @ApiOperation({
    summary: 'Get my appointments',
    description:
      'Returns the authenticated student\'s appointments. ' +
      'Supports filtering by status and date range. ' +
      'Results are paginated and ordered by scheduledAt descending.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Booked', 'Rejected', 'Scheduled', 'Completed', 'Cancelled', 'NoShow'], description: 'Filter by status' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Range start (ISO 8601), e.g. 2026-03-01T00:00:00Z' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'Range end (ISO 8601), e.g. 2026-03-31T23:59:59Z' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 10)' })
  @ApiResponse({ status: 200, description: 'Paginated list of the student\'s appointments.' })
  async getMyAppointments(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query() query: AppointmentsQueryDto,
  ) {
    return this.appointmentsService.getStudentAppointments(
      tenantId,
      user.studentId || user.id,
      query,
    );
  }

  @Post('appointments/:id/cancel')
  @ApiOperation({
    summary: 'Cancel my appointment',
    description:
      'Allows the student to cancel their own **Pending** or **Booked** appointment. ' +
      'A `cancellationReason` is required. ' +
      'Appointments in Completed, Rejected, Cancelled, or NoShow status cannot be cancelled. ' +
      'Staff are notified when a student cancels.',
  })
  @ApiBody({
    type: CancelAppointmentDto,
    examples: {
      example: {
        summary: 'Cancel with reason',
        value: { cancellationReason: 'Schedule conflict – need to reschedule.' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Appointment cancelled. Status is now Cancelled.' })
  @ApiResponse({ status: 400, description: 'Bad Request – appointment cannot be cancelled from its current status.' })
  @ApiResponse({ status: 403, description: 'Forbidden – you can only cancel your own appointments.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  async cancelMyAppointment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancel(
      tenantId,
      params.id,
      dto,
      user.studentId || user.id,
      'student',
    );
  }

  @Post('appointments/check-availability')
  @ApiOperation({
    summary: 'Check if a time slot is available',
    description:
      'Call this before submitting an appointment request to verify that the selected staff member ' +
      'is free and the time slot falls within working hours. ' +
      'Returns `available: true` if both checks pass, or a `reason` code when unavailable:\n' +
      '- `OUTSIDE_WORKING_HOURS` – the slot is outside tenant office hours.\n' +
      '- `STAFF_CONFLICT` – the staff already has a Booked appointment overlapping the slot.',
  })
  @ApiBody({
    type: CheckAvailabilityDto,
    examples: {
      example: {
        summary: 'Check a 60-minute slot',
        value: {
          staffId: '660e8400-e29b-41d4-a716-446655440001',
          scheduledAt: '2026-03-15T10:00:00Z',
          duration: 60,
          timezone: 'Asia/Kathmandu',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Availability result.',
    schema: {
      examples: {
        available: {
          summary: 'Slot available',
          value: {
            available: true,
            scheduledAt: '2026-03-15T10:00:00Z',
            duration: 60,
            endTime: '2026-03-15T11:00:00Z',
            withinWorkingHours: true,
            conflicts: [],
          },
        },
        unavailable: {
          summary: 'Outside working hours',
          value: {
            available: false,
            scheduledAt: '2026-03-15T20:00:00Z',
            duration: 60,
            endTime: '2026-03-15T21:00:00Z',
            withinWorkingHours: false,
            reason: 'OUTSIDE_WORKING_HOURS',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data.' })
  async checkAppointmentAvailability(
    @TenantId() tenantId: string,
    @Body() dto: CheckAvailabilityDto,
  ) {
    return this.appointmentsService.checkAvailability(tenantId, dto);
  }

  // ============================================
  // TASKS
  // ============================================

  @Get('tasks')
  @ApiOperation({
    summary: 'Get my tasks',
    description: 'Returns tasks assigned to the student. Pass `pending=true` to show only Pending/InProgress tasks. Omit or pass `pending=false` to see all tasks.',
  })
  @ApiQuery({ name: 'pending', required: false, type: Boolean, description: 'true = only pending/in-progress; omit or false = all tasks' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  getMyTasks(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('pending') pending?: boolean,
  ) {
    return this.studentPanelService.getMyTasks(tenantId, user.studentId || user.id, pending === true);
  }

  @Patch('tasks/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a task as completed',
    description: 'Allows the assigned student to mark a task as Completed. Only the student the task is assigned to can perform this action.',
  })
  @ApiResponse({ status: 200, description: 'Task marked as completed' })
  @ApiResponse({ status: 403, description: 'You are not the assigned student for this task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  completeMyTask(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
  ) {
    return this.studentPanelService.completeMyTask(tenantId, user.studentId || user.id, params.id);
  }

  // ============================================
  // VISA APPLICATIONS
  // ============================================

  @Get('visa-applications')
  @ApiOperation({ summary: 'Get my visa applications' })
  @ApiResponse({ status: 200, description: 'Visa applications retrieved successfully' })
  getMyVisaApplications(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.studentPanelService.getMyVisaApplications(tenantId, user.studentId || user.id);
  }

  @Get('visa-applications/:id')
  @ApiOperation({ summary: 'Get visa application by ID' })
  @ApiResponse({ status: 200, description: 'Visa application retrieved successfully' })
  getVisaApplicationById(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param() params: IdParamDto,
  ) {
    return this.studentPanelService.getVisaApplicationById(tenantId, user.studentId || user.id, params.id);
  }

  // ============================================
  // PAYMENTS & SERVICES
  // ============================================

  @Get('payments')
  @ApiOperation({ summary: 'Get my payments' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  getMyPayments(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.studentPanelService.getMyPayments(tenantId, user.studentId || user.id);
  }

  @Get('services')
  @ApiOperation({ summary: 'Get my services' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  getMyServices(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.studentPanelService.getMyServices(tenantId, user.studentId || user.id);
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  @Get('notifications')
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  getMyNotifications(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query() queryDto: NotificationsQueryDto,
  ) {
    return this.studentPanelService.getMyNotifications(tenantId, user.studentId || user.id, queryDto);
  }

  @Post('notifications/mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  markNotificationsAsRead(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() markReadDto: MarkNotificationReadDto,
  ) {
    return this.studentPanelService.markNotificationsAsRead(tenantId, user.studentId || user.id, markReadDto);
  }

  @Post('notifications/mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllNotificationsAsRead(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.studentPanelService.markAllNotificationsAsRead(tenantId, user.studentId || user.id);
  }

  @Get('notifications/stream')
  @ApiOperation({
    summary: 'Real-time notification stream (SSE)',
    description:
      'Server-Sent Events endpoint. Keep this connection open to receive student notifications in real-time without polling.',
  })
  @ApiResponse({ status: 200, description: 'SSE stream established' })
  streamStudentNotifications(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const studentId = user.studentId || user.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

    const keepAliveInterval = setInterval(() => {
      res.write(':ping\n\n');
    }, 30000);

    const subscription = this.studentPanelService
      .getNotificationStream()
      .subscribe({
        next: (event) => {
          if (event.tenantId === tenantId && event.studentId === studentId) {
            res.write(`data: ${JSON.stringify(event.data)}\n\n`);
          }
        },
        error: () => {
          clearInterval(keepAliveInterval);
          res.end();
        },
      });

    req.on('close', () => {
      clearInterval(keepAliveInterval);
      subscription.unsubscribe();
      res.end();
    });
  }

  // ============================================
  // UNIVERSITIES & COURSES (READ-ONLY)
  // ============================================

  @Get('universities')
  @ApiOperation({ summary: 'Browse universities' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Universities retrieved successfully' })
  getUniversities(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.studentPanelService.getUniversities(tenantId, page, limit, search);
  }

  @Get('universities/:id')
  @ApiOperation({ summary: 'Get university details' })
  @ApiResponse({ status: 200, description: 'University retrieved successfully' })
  getUniversityById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentPanelService.getUniversityById(tenantId, params.id);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Browse courses' })
  @ApiQuery({ name: 'universityId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  getCourses(
    @TenantId() tenantId: string,
    @Query('universityId') universityId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.studentPanelService.getCourses(tenantId, universityId, page, limit, search);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Get course details' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  getCourseById(@TenantId() tenantId: string, @Param() params: IdParamDto) {
    return this.studentPanelService.getCourseById(tenantId, params.id);
  }
}
