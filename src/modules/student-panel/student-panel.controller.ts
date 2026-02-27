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
} from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get my student profile' })
  @ApiResponse({ status: 200, description: 'Student profile retrieved successfully' })
  getMyProfile(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.studentPanelService.getMyProfile(tenantId, user.studentId || user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update my student profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  updateMyProfile(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateStudentProfileDto,
  ) {
    return this.studentPanelService.updateMyProfile(tenantId, user.studentId || user.id, updateDto);
  }

  @Post('profile/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change my password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
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
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully', type: DashboardStatsResponseDto })
  getDashboardStats(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.studentPanelService.getDashboardStats(tenantId, user.studentId || user.id);
  }

  // ============================================
  // DOCUMENTS
  // ============================================

  @Get('documents')
  @ApiOperation({ summary: 'Get my documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  getMyDocuments(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query() queryDto: DocumentsQueryDto,
  ) {
    return this.studentPanelService.getMyDocuments(tenantId, user.studentId || user.id, queryDto);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Upload a document' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
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
  @ApiOperation({ summary: 'Get my course applications' })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  getMyCourseApplications(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query() queryDto: StudentApplicationsQueryDto,
  ) {
    return this.studentPanelService.getMyCourseApplications(tenantId, user.studentId || user.id, queryDto);
  }

  @Post('applications')
  @ApiOperation({ summary: 'Create a new course application' })
  @ApiResponse({ status: 201, description: 'Application created successfully' })
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

  @Post('appointments/request')
  @ApiOperation({ summary: 'Request a new appointment' })
  @ApiBody({ type: CreateAppointmentRequestDto })
  @ApiResponse({ status: 201, description: 'Appointment request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data or time slot not available' })
  @ApiResponse({ status: 409, description: 'Time slot conflict with existing appointment' })
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
  @ApiOperation({ summary: 'Get my appointments with filtering' })
  @ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Booked', 'Rejected', 'Scheduled', 'Completed', 'Cancelled', 'NoShow'] })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'ISO date string' })
  @ApiResponse({ status: 200, description: 'Appointments retrieved successfully' })
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
  @ApiOperation({ summary: 'Cancel my appointment' })
  @ApiBody({ type: CancelAppointmentDto })
  @ApiResponse({ status: 200, description: 'Appointment cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiResponse({ status: 400, description: 'Appointment cannot be cancelled' })
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
  @ApiOperation({ summary: 'Check if a time slot is available' })
  @ApiBody({ type: CheckAvailabilityDto })
  @ApiResponse({ status: 200, description: 'Availability checked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
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
  @ApiOperation({ summary: 'Get my tasks' })
  @ApiQuery({ name: 'pending', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  getMyTasks(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('pending') pending?: boolean,
  ) {
    return this.studentPanelService.getMyTasks(tenantId, user.studentId || user.id, pending !== false);
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
